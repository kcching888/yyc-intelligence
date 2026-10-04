import { useEffect, useState, useRef, useMemo } from "react";

// Linearly interpolate position and bearing between two station objects
function interpolatePosition(prevStation, nextStation, progress) {
  const lat = prevStation.latitude + (nextStation.latitude - prevStation.latitude) * progress;
  const lng = prevStation.longitude + (nextStation.longitude - prevStation.longitude) * progress;

  // Calculate direction angle (bearing in degrees)
  const dLng = nextStation.longitude - prevStation.longitude;
  const dLat = nextStation.latitude - prevStation.latitude;
  const bearing = (Math.atan2(dLng, dLat) * 180) / Math.PI;

  return { lat, lng, bearing: (bearing + 360) % 360 };
}

export default function useCTrainStations() {
  const [stations, setStations] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function fetchStations() {
      try {
        const response = await fetch("/api/ctrain-stations");
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Handle raw array or nested payload properties
        const rawList = Array.isArray(data)
          ? data
          : data.stations || data.data || data.features || [];

        // Normalize data to ensure numbers are correctly typed
        const parsedStations = rawList.map((s) => ({
          stopId: String(s.stopId),
          name: String(s.name),
          line: String(s.line),
          latitude: Number(s.latitude),
          longitude: Number(s.longitude),
        }));

        if (isMounted) {
          setStations(parsedStations);
        }
      } catch (error) {
        console.error("Error fetching CTrain stations:", error);
      }
    }

    fetchStations();

    return () => {
      isMounted = false;
    };
  }, []);

console.log("CTrain Stations Simulation", stations );

  return stations;
}