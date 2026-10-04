import Papa from "papaparse";

const CITY_INCIDENTS_API =
  "https://data.calgary.ca/resource/4jah-h97u.json?$limit=500";

const CITY_CAMERAS_CSV =
  "https://data.calgary.ca/api/views/k7p9-kppz/rows.csv?accessType=DOWNLOAD&api_foundry=true";

function getPoint(row) {
  let longitude = Number(
    row.longitude ?? row.lon ?? row.lng
  );

  let latitude = Number(
    row.latitude ?? row.lat
  );

  const point =
    row.point ?? row.location ?? row.coordinates;

  if (point && typeof point === "object") {
    longitude = Number(
      point.longitude ??
        point.lon ??
        point.coordinates?.[0] ??
        longitude
    );

    latitude = Number(
      point.latitude ??
        point.lat ??
        point.coordinates?.[1] ??
        latitude
    );
  }

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    const values =
      String(point || "").match(
        /-?\d+\.\d+/g
      ) || [];

    if (!Number.isFinite(latitude)) {
      latitude = Number(values[0]);
    }

    if (!Number.isFinite(longitude)) {
      longitude = Number(values[1]);
    }
  }

  return {
    longitude,
    latitude,
  };
}

export function normalizeIncident(row, index) {
  const point = getPoint(row);

  return {
    id: `incident-${row.id || index}`,
    title:
      row.incident_info ||
      row.description ||
      row.incident_type ||
      "Traffic incident",
    description: row.description || "",
    longitude: point.longitude,
    latitude: point.latitude,
  };
}

export function normalizeCamera(row, index) {
  const cameraText = String(
    row["Camera URL"] || ""
  );

  const directImageUrl =
    cameraText.match(
      /https?:\/\/[^)\s]+/i
    )?.[0] || "";

  const name = cameraText
    .replace(
      /\s*\(https?:\/\/[^)]+\)\s*/i,
      ""
    )
    .trim();

  const pointText = String(row.Point || "");

  const coordinates =
    pointText.match(/-?\d+\.\d+/g) || [];

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  return {
    id: `camera-${index}`,
    name: name || `Camera ${index + 1}`,
    location:
      row["Camera Location"] ||
      row.Quadrant ||
      "",
    directImageUrl,
    image: directImageUrl
      ? `/camera-image?url=${encodeURIComponent(
          directImageUrl
        )}`
      : "",
    officialUrl:
      "https://maps.calgary.ca/TrafficInformation/",
    longitude,
    latitude,
  };
}

function hasCoordinates(item) {
  return (
    Number.isFinite(item.longitude) &&
    Number.isFinite(item.latitude)
  );
}

export async function fetchTrafficData() {
  const [incidentResponse, cameraResponse] =
    await Promise.all([
      fetch(CITY_INCIDENTS_API),
      fetch(CITY_CAMERAS_CSV),
    ]);

  if (!incidentResponse.ok) {
    throw new Error(
      `Incident feed HTTP ${incidentResponse.status}`
    );
  }

  if (!cameraResponse.ok) {
    throw new Error(
      `Camera feed HTTP ${cameraResponse.status}`
    );
  }

  const incidentRows = await incidentResponse.json();
  const cameraCsv = await cameraResponse.text();

  const parsedCameras = Papa.parse(cameraCsv, {
    header: true,
    skipEmptyLines: true,
  });

  const incidents = incidentRows
    .map(normalizeIncident)
    .filter(hasCoordinates);

  const cameras = parsedCameras.data
    .map(normalizeCamera)
    .filter(hasCoordinates);

  return {
    incidents,
    cameras,
  };
}