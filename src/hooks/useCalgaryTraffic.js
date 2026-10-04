import { useCallback, useEffect, useState } from "react";
import Papa from "papaparse";

const CITY_INCIDENTS_API =
  "https://data.calgary.ca/resource/4jah-h97u.json?$limit=500";

const CITY_CAMERAS_CSV =
  "https://data.calgary.ca/api/views/k7p9-kppz/rows.csv?accessType=DOWNLOAD&api_foundry=true";


import {
  normalizeIncident,
  normalizeCamera,
} from "../utils/trafficUtils";

export default function useCalgaryTraffic() {
  const [incidents, setIncidents] = useState([]);
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  const refresh = useCallback(
  async (isManual = false) => {
    if (isManual) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
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

      const incidentRows =
        await incidentResponse.json();

      const cameraCsv =
        await cameraResponse.text();

      const parsedCameras = Papa.parse(
        cameraCsv,
        {
          header: true,
          skipEmptyLines: true,
        }
      );

      const cameraRows = parsedCameras.data;

      const normalizedIncidents =
        incidentRows
          .map(normalizeIncident)
          .filter(
            (incident) =>
              Number.isFinite(
                incident.longitude
              ) &&
              Number.isFinite(
                incident.latitude
              )
          );

      const normalizedCameras =
        cameraRows
          .map(normalizeCamera)
          .filter(
            (camera) =>
              Number.isFinite(
                camera.longitude
              ) &&
              Number.isFinite(
                camera.latitude
              )
          );

      setIncidents(normalizedIncidents);
      setCameras(normalizedCameras);
      setLastUpdated(new Date());
    } catch (refreshError) {
      setError(refreshError.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  },
  []
);

  useEffect(() => {
    refresh();

    const timer = setInterval(
      refresh,
      10 * 60 * 1000
    );

    return () => {
      clearInterval(timer);
    };
  }, [refresh]);

  return {
    incidents,
    cameras,
    loading,
    refreshing,
    error,
    lastUpdated,
    refresh,
  };
}