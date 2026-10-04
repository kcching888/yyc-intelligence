import express from "express";
import path from "node:path";
import AdmZip from "adm-zip";
import Papa from "papaparse";
import cors from "cors";
import { fileURLToPath } from "node:url";
import gtfsRealtimeBindings from "gtfs-realtime-bindings";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const {
  transit_realtime: { FeedMessage },
} = gtfsRealtimeBindings;

const CALGARY_TRANSIT_VEHICLES_URL =
  process.env.CALGARY_TRANSIT_VEHICLES_URL ||
  "https://data.calgary.ca/download/am7c-qe3u/application%2Foctet-stream";

const CALGARY_GTFS_SCHEDULE_URL =
  process.env.CALGARY_GTFS_SCHEDULE_URL ||
  "https://data.calgary.ca/download/npk7-z3bj/application%2Fzip";

const app = express();

let cachedPayload = null;
let cachedAt = 0;
const CACHE_MS = 20 * 1000;

let routeLookup = new Map();
let tripRouteLookup = new Map();
let gtfsLoadedAt = 0;
let gtfsLoadPromise = null; // de-dupes concurrent loads

let ctrainStations = [];

const GTFS_CACHE_MS = 24 * 60 * 60 * 1000;
const GTFS_RETRY_MS = 60 * 1000; // back-off after a failed load
let gtfsLastFailureAt = 0;

const vehiclePositionHistory = new Map();
const MIN_MOVEMENT_DEGREES = 0.00005;

// CORS must come before routes. The cors middleware already answers
// OPTIONS preflight requests, so no separate app.options("*") is needed
// (and "*" is an invalid path in Express 5, which crashes the server on boot).
app.use(
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// Helper to extract base CTrain line (e.g., "201-20786" -> "201")
function getBaseRouteId(routeId) {
  if (!routeId) return "";
  // "201-20786" -> "201"; exact match so buses like "2010" aren't mistaken for CTrain
  return String(routeId).trim().split("-")[0];
}

// Parse a CSV string row-by-row without keeping every row in memory.
function parseCsvStream(text, onRow) {
  // GTFS files often start with a UTF-8 BOM, which corrupts the first header
  // name (e.g. "\ufeffroute_id") and makes that column read as undefined.
  const clean = text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;

  Papa.parse(clean, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.replace(/^\uFEFF/, "").trim(),
    step: (result) => {
      const row = Array.isArray(result.data) ? result.data[0] : result.data;
      if (row) onRow(row);
    },
  });
}

async function fetchWithTimeout(url, ms) {
  return fetch(url, { signal: AbortSignal.timeout(ms) });
}

async function doLoadGtfs() {
  console.log("[GTFS] Starting GTFS schedule load sequence...");
  console.log(`[GTFS] Fetching schedule from: ${CALGARY_GTFS_SCHEDULE_URL}`);

  const response = await fetchWithTimeout(CALGARY_GTFS_SCHEDULE_URL, 120_000);
  if (!response.ok) {
    throw new Error(
      `GTFS HTTP Request Failed with Status: ${response.status} ${response.statusText}`
    );
  }

  console.log("[GTFS] Archive downloaded. Extracting ZIP contents...");
  const zip = new AdmZip(Buffer.from(await response.arrayBuffer()));

  const routesEntry = zip.getEntry("routes.txt");
  const tripsEntry = zip.getEntry("trips.txt");
  const stopsEntry = zip.getEntry("stops.txt");
  const stopTimesEntry = zip.getEntry("stop_times.txt");

  if (!routesEntry || !tripsEntry || !stopsEntry || !stopTimesEntry) {
    const entriesFound = zip.getEntries().map((e) => e.entryName).join(", ");
    throw new Error(`GTFS archive missing required files. Entries found: [${entriesFound}]`);
  }

  console.log("[GTFS] Parsing CSV files...");

  const nextRouteLookup = new Map();
  const nextTripRouteLookup = new Map();
  const ctrainRouteIds = new Set();
  const ctrainTripIds = new Map();
  const stopById = new Map();

  parseCsvStream(routesEntry.getData().toString("utf8"), (route) => {
    const routeId = String(route.route_id || "");
    const baseRoute = getBaseRouteId(routeId);

    const shortName = String(route.route_short_name || "").trim();
    const isCtrain =
      baseRoute === "201" || baseRoute === "202" || shortName === "201" || shortName === "202";

    if (isCtrain) {
      ctrainRouteIds.add(routeId);
      if (shortName === "201" || shortName === "202") {
        // make sure the lookup maps this route to its line number
        nextRouteLookup.set(routeId, {
          name: shortName,
          routeType: Number(route.route_type ?? -1),
          baseRoute: shortName,
        });
        return;
      }
    }

    nextRouteLookup.set(routeId, {
      name: route.route_short_name || route.route_long_name || routeId,
      routeType: Number(route.route_type ?? -1),
      baseRoute,
    });
  });

  parseCsvStream(tripsEntry.getData().toString("utf8"), (trip) => {
    const tripId = String(trip.trip_id || "");
    const routeId = String(trip.route_id || "");
    nextTripRouteLookup.set(tripId, routeId);

    if (ctrainRouteIds.has(routeId)) {
      ctrainTripIds.set(tripId, nextRouteLookup.get(routeId)?.baseRoute || getBaseRouteId(routeId));
    }
  });

  parseCsvStream(stopsEntry.getData().toString("utf8"), (stop) => {
    stopById.set(String(stop.stop_id), stop);
  });

  // stop_times.txt is by far the largest file; stream it and keep only
  // what's needed (station -> set of CTrain lines).
  const stationLines = new Map();
  let stopTimeRows = 0;

  parseCsvStream(stopTimesEntry.getData().toString("utf8"), (stopTime) => {
    stopTimeRows++;
    const baseRouteNumber = ctrainTripIds.get(String(stopTime.trip_id || ""));
    if (!baseRouteNumber) return;

    const stopId = String(stopTime.stop_id || "");
    const stop = stopById.get(stopId);
    if (!stop) return;

    const parentStationId = String(stop.parent_station || stopId);
    let lines = stationLines.get(parentStationId);
    if (!lines) {
      lines = new Set();
      stationLines.set(parentStationId, lines);
    }
    lines.add(baseRouteNumber);
  });

  console.log(
    `[GTFS] Rows parsed - Routes: ${nextRouteLookup.size}, Trips: ${nextTripRouteLookup.size}, Stops: ${stopById.size}, StopTimes: ${stopTimeRows}`
  );
  console.log(
    `[GTFS] CTrain route ids: ${ctrainRouteIds.size} [${[...ctrainRouteIds].slice(0, 5).join(", ")}], CTrain trips: ${ctrainTripIds.size}, candidate stations: ${stationLines.size}`
  );
  if (ctrainRouteIds.size === 0) {
    const sample = [...nextRouteLookup.entries()].slice(0, 5);
    console.warn("[GTFS] No CTrain routes matched. Sample routes:", JSON.stringify(sample));
  }

  const nextCtrainStations = [...stationLines.entries()]
    .map(([stationId, lines]) => {
      const stop = stopById.get(stationId);
      if (!stop) return null;

      const hasRedLine = lines.has("201");
      const hasBlueLine = lines.has("202");

      return {
        stopId: stationId,
        name: stop.stop_name || "CTrain station",
        latitude: Number(stop.stop_lat),
        longitude: Number(stop.stop_lon),
        line:
          hasRedLine && hasBlueLine ? "both" : hasRedLine ? "201" : hasBlueLine ? "202" : "unknown",
      };
    })
    .filter((s) => s && Number.isFinite(s.latitude) && Number.isFinite(s.longitude));

  if (nextCtrainStations.length === 0) {
    throw new Error("GTFS parsed but produced 0 CTrain stations (see diagnostics above)");
  }

  routeLookup = nextRouteLookup;
  tripRouteLookup = nextTripRouteLookup;
  ctrainStations = nextCtrainStations;
  gtfsLoadedAt = Date.now();

  console.log(`[GTFS] Success: cached ${ctrainStations.length} CTrain stations.`);
}

async function loadGtfsLookups() {
  const now = Date.now();

  // Fresh cache
  if (gtfsLoadedAt > 0 && now - gtfsLoadedAt < GTFS_CACHE_MS) return;

  // A load is already running: share it instead of starting another download
  if (gtfsLoadPromise) return gtfsLoadPromise;

  // Recently failed: don't hammer the upstream on every request
  if (gtfsLastFailureAt && now - gtfsLastFailureAt < GTFS_RETRY_MS) {
    if (gtfsLoadedAt > 0) return; // serve stale data
    throw new Error("GTFS schedule is unavailable (recent load failed); retrying shortly");
  }

  gtfsLoadPromise = doLoadGtfs()
    .then(() => {
      gtfsLastFailureAt = 0;
    })
    .catch((error) => {
      gtfsLastFailureAt = Date.now();
      console.error("[GTFS ERROR] Failed to load GTFS static data:", error);
      // Keep serving stale data if we have any
      if (gtfsLoadedAt === 0) throw error;
    })
    .finally(() => {
      gtfsLoadPromise = null;
    });

  return gtfsLoadPromise;
}

function calculateBearing(previous, current) {
  const toRadians = (val) => (val * Math.PI) / 180;
  const toDegrees = (val) => (val * 180) / Math.PI;

  const lat1 = toRadians(previous.latitude);
  const lat2 = toRadians(current.latitude);
  const deltaLon = toRadians(current.longitude - previous.longitude);

  const y = Math.sin(deltaLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  return Math.round((toDegrees(Math.atan2(y, x)) + 360) % 360);
}

app.get("/api/transit-vehicles", async (_request, response) => {
  try {
    const now = Date.now();

    if (cachedPayload && now - cachedAt < CACHE_MS) {
      return response.json(cachedPayload);
    }

    // Route names are nice-to-have; don't fail live positions if GTFS is down.
    try {
      await loadGtfsLookups();
    } catch (error) {
      console.warn("[transit-vehicles] Continuing without GTFS lookups:", error.message);
    }

    const feedResponse = await fetchWithTimeout(CALGARY_TRANSIT_VEHICLES_URL, 15_000);

    if (!feedResponse.ok) {
      return response.status(feedResponse.status).json({
        error: `Calgary Transit feed HTTP ${feedResponse.status}`,
      });
    }

    const buffer = Buffer.from(await feedResponse.arrayBuffer());
    const feed = FeedMessage.decode(new Uint8Array(buffer));
    const entities = feed.entity || [];
    const seenKeys = new Set();

    const vehicles = entities
      .map((entity, index) => {
        const vehicle = entity.vehicle;
        const position = vehicle?.position;
        const trip = vehicle?.trip;

        const latitude = Number(position?.latitude);
        const longitude = Number(position?.longitude);

        if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
          return null;
        }

        const timestampSeconds = Number(vehicle?.timestamp ?? entity.timestamp ?? 0);

        const tripId = trip?.tripId || "";
        const rawRouteId = trip?.routeId || tripRouteLookup.get(String(tripId)) || "";
        const routeInfo = routeLookup.get(String(rawRouteId)) || {};

        const routeId = routeInfo.baseRoute || getBaseRouteId(rawRouteId);
        const routeName = routeInfo.name || routeId || "";

        const vehicleKey = String(vehicle?.vehicle?.id || entity.id || `transit-${index}`);
        seenKeys.add(vehicleKey);

        const previousPosition = vehiclePositionHistory.get(vehicleKey);
        let bearing = Number(position?.bearing ?? 0);

        if (previousPosition) {
          const latitudeChange = Math.abs(latitude - previousPosition.latitude);
          const longitudeChange = Math.abs(longitude - previousPosition.longitude);

          if (latitudeChange > MIN_MOVEMENT_DEGREES || longitudeChange > MIN_MOVEMENT_DEGREES) {
            bearing = calculateBearing(previousPosition, { latitude, longitude });
          }
        }

        vehiclePositionHistory.set(vehicleKey, { latitude, longitude });

        return {
          id: vehicleKey,
          vehicleId: vehicle?.vehicle?.id || "",
          routeId,
          routeName,
          tripId,
          bearing,
          latitude,
          longitude,
          timestamp: timestampSeconds > 0 ? new Date(timestampSeconds * 1000).toISOString() : null,
        };
      })
      .filter(Boolean);

    // Drop history for vehicles no longer in the feed so the map doesn't grow forever
    for (const key of vehiclePositionHistory.keys()) {
      if (!seenKeys.has(key)) vehiclePositionHistory.delete(key);
    }

    cachedPayload = {
      entities: vehicles,
      updatedAt: new Date().toISOString(),
    };
    cachedAt = now;

    response.json(cachedPayload);
  } catch (error) {
    console.error("[transit-vehicles] Error:", error);
    response.status(502).json({
      error: error?.message || "Unable to load Calgary Transit vehicle positions",
    });
  }
});

// Returns a direct array matching frontend expectations
app.get("/api/ctrain-stations", async (_request, response) => {
  try {
    await loadGtfsLookups();
    response.json(ctrainStations);
  } catch (error) {
    console.error("Unable to load CTrain stations:", error);
    response.status(500).json({
      error: "Unable to load CTrain station data",
    });
  }
});

// Static frontend + SPA fallback.
// Uses plain middleware instead of app.get("*") so it works on Express 4 and 5.
const distDirectory = path.join(__dirname, "..", "dist");
app.use(express.static(distDirectory));

app.use((request, response) => {
  if (request.path.startsWith("/api/")) {
    return response.status(404).json({ error: "Not found" });
  }
  response.sendFile(path.join(distDirectory, "index.html"), (error) => {
    if (error && !response.headersSent) {
      response.status(404).send("Frontend build not found. Run `vite build` or use the Vite dev server.");
    }
  });
});

// Log instead of silently dying on stray async errors
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
});
process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
});

const port = Number(process.env.PORT) || 3001;
const host = "0.0.0.0"; // listens on IPv4 (127.0.0.1) as well

const server = app.listen(port, host, () => {
  console.log(`Calgary Traffic Intelligence server running on http://${host}:${port}`);
  // Warm the GTFS cache in the background so the first request isn't slow
  loadGtfsLookups().catch(() => {});
});

server.on("error", (error) => {
  if (error.code === "EADDRINUSE") {
    console.error(`Port ${port} is already in use. Stop the other process or set PORT.`);
  } else {
    console.error("Server error:", error);
  }
  process.exit(1);
});
