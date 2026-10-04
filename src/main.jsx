import "maplibre-gl/dist/maplibre-gl.css";
import "./styles.css";
import { fetchTrafficData } from "./api/trafficApi";
import IncidentMap from "./features/traffic/IncidentMap";
import useCalgaryTraffic from "./hooks/useCalgaryTraffic";

import CameraPanel from "./components/CameraPanel";
import TrafficFilters from "./components/TrafficFilters";
import TrafficHeader from "./components/TrafficHeader";
import TrafficBottomBar from "./components/TrafficBottomBar";
import IncidentList from "./components/IncidentList";
import IncidentDetails from "./components/IncidentDetails";
import useCalgaryTransit from "./hooks/useCalgaryTransit";
import useCTrainSimulator from "./hooks/useCTrainSimulator";
import useCTrainStations from "./features/traffic/useCTrainStations";

import MapErrorBoundary from "./features/traffic/MapErrorBoundary";


import React, {
  useCallback,
  useMemo,
  useState,
} from "react";

import { createRoot } from "react-dom/client";


import {
  corridors,
  cameraCorridors,
} from "./config/trafficConfig";




function App() {

  const {
  incidents,
  cameras,
  loading,
  refreshing,
  error,
  lastUpdated,
  refresh,
} = useCalgaryTraffic();


  
  const [focusIncident, setFocusIncident] = useState(null);

  
  const [selectedCamera, setSelectedCamera] =
    useState(null);
    
  const [cameraCorridor, setCameraCorridor] =
  useState("all");

const [cameraSearch, setCameraSearch] =
  useState("");

const [filtersOpen, setFiltersOpen] = useState(true);

const [showCameras, setShowCameras] = useState(true);
const [showIncidents, setShowIncidents] = useState(true);
const [showTransit, setShowTransit] = useState(false);


const [incidentSelection, setIncidentSelection] =
  useState({
    corridorName: "",
    incidents: [],
  });

  
  const corridorCounts = useMemo(() => {
    return corridors.map((corridor) => {
      const count = incidents.filter((incident) => {
        const text = (
          incident.title +
          " " +
          incident.description
        ).toLowerCase();

        return corridor.terms.some((term) =>
          text.includes(term)
        );
      }).length;

      return {
        ...corridor,
        count,
      };
    });
  }, [incidents]);

const filteredCameras = useMemo(() => {
  const search = cameraSearch.trim().toLowerCase();

  const selectedCorridor = cameraCorridors.find(
    (corridor) =>
      corridor.id === cameraCorridor
  );

  return cameras.filter((camera) => {
    const cameraText = [
      camera.name,
      camera.location,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    const matchesCorridor =
      cameraCorridor === "all" ||
      selectedCorridor.terms.some((term) =>
        cameraText.includes(term)
      );

    const matchesSearch =
      !search || cameraText.includes(search);

    return matchesCorridor && matchesSearch;
  });
}, [
  cameras,
  cameraCorridor,
  cameraSearch,
]);


const updatedText = loading
  ? "Updating…"
  : error
    ? "Feed issue"
    : lastUpdated
      ? `Updated ${lastUpdated.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })}`
      : "Waiting for data";

  const firstIncident = incidents[0];

const handleCameraSelect = React.useCallback((camera) => {
  setSelectedCamera(camera);
}, []);


const handleCorridorClick = useCallback(
  (corridorName) => {
    const corridor = corridors.find(
      (item) => item.name === corridorName
    );

    if (!corridor) return;

    const matches = incidents.filter(
      (incident) => {
        const text =
          `${incident.title} ${incident.description}`
            .toLowerCase();

        return corridor.terms.some((term) =>
          text.includes(term)
        );
      }
    );

    if (matches.length === 0) return;

    if (matches.length === 1) {
      setFocusIncident(matches[0]);
      setCorridorIncidents([]);
      return;
    }

    setCorridorIncidents(matches);
  },
  [incidents]
);

const handleCloseCorridorIncidents = useCallback(() => {
  setCorridorIncidents([]);
}, []);


{incidentSelection.incidents.length > 0 && (
  <IncidentList
    incidents={incidentSelection.incidents}
    corridorName={incidentSelection.corridorName}
    onSelect={(incident) => {
      setFocusIncident(incident);
      setIncidentSelection({
        corridorName: "",
        incidents: [],
      });
    }}
    onClose={() => {
      setIncidentSelection({
        corridorName: "",
        incidents: [],
      });
    }}
  />
)}

{focusIncident && (
  <IncidentDetails
    incident={focusIncident}
    onClose={() => {
      setFocusIncident(null);
    }}
  />
)}

const {
  transitVehicles,
  loading: transitLoading,
  error: transitError,
  lastUpdated: transitUpdated,
  refresh: refreshTransit,
} = useCalgaryTransit({
  enabled: showTransit,
});

const ctrainStations = useCTrainStations() || [];

const activeTrips = useMemo(() => [
    {
      id: "train-202-1",
      routeId: "202",
      prevStopId: "3627",
      nextStopId: "3629",
      departureTime: Date.now() - 30000,
      arrivalTime: Date.now() + 90000,
    },
  ], []);

const animatedTrains = useCTrainSimulator({
    enabled: true,
    stations: ctrainStations,
    activeTrips: activeTrips,
  });



const transitCount = showTransit
  ? transitVehicles.length
  : 0;

// Inside parent component before passing into IncidentMap:
const combinedTransit = [
  ...transitVehicles,
  ...animatedTrains // From useCTrainInterpolation
];

//console.log("Incident count:", incidents.length);
//console.log("First incident:", incidents[0]);
//console.log("Show incidents:", showIncidents);

console.log("combinedTransit: ", combinedTransit);

  return (
    <main>
<MapErrorBoundary>
<IncidentMap
  incidents={showIncidents ? incidents : []}
  cameras={showCameras ? filteredCameras : []}
  transitVehicles={combinedTransit}
  showCameras={showCameras}
  showIncidents={showIncidents}
  showTransit={showTransit}
  focusIncident={focusIncident}
  onFocusClear={() => { setFocusIncident(null);}}
  onCameraSelect={handleCameraSelect}
/>
</MapErrorBoundary>

      {selectedCamera && (
        <div className="camera-modal">
          <CameraPanel
            camera={selectedCamera}
            onClose={() => {
              setSelectedCamera(null);
            }}
          />
        </div>
      )}



{incidentSelection.incidents.length > 0 && (
  <IncidentList
    incidents={incidentSelection.incidents}
    corridorName={incidentSelection.corridorName}
    onSelect={(incident) => {
      setFocusIncident(incident);
      setIncidentSelection({
        corridorName: "",
        incidents: [],
      });
    }}
    onClose={() => {
      setIncidentSelection({
        corridorName: "",
        incidents: [],
      });
    }}
  />
)}


      <TrafficFilters
  corridors={cameraCorridors}
  selectedCorridor={cameraCorridor}
  search={cameraSearch}
  cameraCount={filteredCameras.length}
  isOpen={filtersOpen}
  onToggle={() => {
    setFiltersOpen((open) => !open);
  }}
  onCorridorChange={setCameraCorridor}
  onSearchChange={setCameraSearch}
/>



      <TrafficHeader
  corridorCounts={corridorCounts}
  cameraCount={filteredCameras.length}
  cameraCorridor={cameraCorridor}
  updatedText={updatedText}
  loading={loading}
  refreshing={refreshing}
  error={error}
  lastUpdated={lastUpdated}
  onRefresh={() => {
    refresh(true);
  }}
  onCorridorClick={handleCorridorClick}
/>

      <TrafficBottomBar
  error={error}
  loading={loading}
  firstIncident={firstIncident}
  cameraCount={filteredCameras.length}
  showCameras={showCameras}
  showIncidents={showIncidents}
  showTransit={showTransit}
  transitCount={transitCount}
  onToggleCameras={() => {
    setShowCameras((visible) => !visible);
  }}
  onToggleIncidents={() => {
    setShowIncidents((visible) => !visible);
  }}
  onToggleTransit={() => {
    setShowTransit((visible) => !visible);
  }}
  onFocusIncident={setFocusIncident}
/> 

    </main>
  );
}

createRoot(
  document.getElementById("root")
).render(<App />);