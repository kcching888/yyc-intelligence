import { useCallback, useEffect, useState } from "react";

const TRANSIT_VEHICLES_API =
  "/api/transit-vehicles";

function normalizeTransitVehicle(
  vehicle,
  index
) {
  const latitude = Number(
    vehicle.latitude
  );

  const longitude = Number(
    vehicle.longitude
  );

  if (
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return null;
  }

  const rawTimestamp =
    vehicle.timestamp || "";

  const parsedTimestamp =
    rawTimestamp
      ? new Date(rawTimestamp)
      : null;

  const validTimestamp =
    parsedTimestamp &&
    !Number.isNaN(
      parsedTimestamp.getTime()
    )
      ? parsedTimestamp.toISOString()
      : "";

  return {
    id: String(
      vehicle.id ||
        vehicle.vehicleId ||
        `transit-${index}`
    ),
    vehicleId: String(
      vehicle.vehicleId || ""
    ),
    routeId: String(
      vehicle.routeId || ""
    ),
    routeName: String(
      vehicle.routeName || ""
    ),
    tripId: String(
      vehicle.tripId || ""
    ),
    bearing: Number(
      vehicle.bearing ?? 0
    ),
    latitude,
    longitude,
    timestamp: validTimestamp,
  };
}
export default function useCalgaryTransit({
  enabled = false,
  intervalMs = 30000,
} = {}) {
  const [transitVehicles, setTransitVehicles] =
    useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] =
    useState(null);

  const refresh = useCallback(async () => {
  if (!enabled) return;

  setLoading(true);
  setError("");

  try {
    const response = await fetch(
      TRANSIT_VEHICLES_API
    );

    if (!response.ok) {
      throw new Error(
        `Transit feed HTTP ${response.status}`
      );
    }

    const payload = await response.json();

    console.log(
      "Transit API response:",
      payload
    );

    const entities = Array.isArray(payload)
      ? payload
      : payload.entities || [];

    const normalizedVehicles = entities
      .map(normalizeTransitVehicle)
      .filter(Boolean);

    console.log(
      "Normalized transit vehicles:",
      normalizedVehicles
    );

    setTransitVehicles(normalizedVehicles);

     //console.log(     "transitVehicles: ",  transitVehicles  );

    setLastUpdated(new Date());
  } catch (transitError) {
    setError(transitError.message);
  } finally {
    setLoading(false);
  }
}, [enabled]);

  useEffect(() => {
    if (!enabled) {
      setTransitVehicles([]);
      return;
    }

    refresh();

    const timer = setInterval(() => {
      refresh();
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [enabled, intervalMs, refresh]);

   //console.log(      "transitVehicles2: ",  transitVehicles  );

  return {
    transitVehicles,
    loading,
    error,
    lastUpdated,
    refresh,
  };
}