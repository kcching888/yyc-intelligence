import { useEffect, useState } from "react";

const CTRAIN_STATIONS_API =
  "/api/ctrain-stations";

export default function useCTrainStations() {
  const [stations, setStations] =
    useState([]);

  useEffect(() => {
    let cancelled = false;

    async function loadStations() {
      try {
        const response = await fetch(
          CTRAIN_STATIONS_API
        );

        if (!response.ok) {
          throw new Error(
            `CTrain stations HTTP ${response.status}`
          );
        }

        // console.log("CTrain Station API raw response:", response );

        const payload =
          await response.json();

         //console.log(  "CTrain Station API response:",   payload  );

     
        if (!cancelled) {
        const stationList = Array.isArray(payload) ? payload : (payload.stations || payload.features || []);
          setStations(
            stationList
            //payload.stations || []
          );

      //console.log("CTrain StationList:", stationList );
        }
      } catch (error) {
        console.error(error);
      }
    }

    loadStations();

    return () => {
      cancelled = true;
    };
  }, []);

  //console.log("CTrain Stations", stations );

  return stations;
}