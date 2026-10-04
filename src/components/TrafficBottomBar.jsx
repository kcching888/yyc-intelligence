import {
  Camera,
  MapPin,
  RefreshCw,
} from "lucide-react";

function TrafficBottomBar({
  error,
  loading,
  firstIncident,
  cameraCount,
  showCameras,
  showIncidents,
  showTransit,
  transitCount,
  onToggleCameras,
  onToggleIncidents,
  onToggleTransit,
  onFocusIncident,
}) {
 const tickerText = error
  ? `Traffic feeds unavailable: ${error}`
  : loading
    ? "Loading Calgary traffic feeds..."
    : firstIncident?.title ||
      "No current traffic incidents";

  return (
    <section className="bottom">
      <div className="legend">
        <span className="dot green" />
        Clear

        <span className="dot red" />
        Incidents

        <span className="dot blue" />
        Cameras
      </div>

   <button
  type="button"
  className={
    error
      ? "ticker ticker-error"
      : "ticker"
  }
  disabled={!firstIncident || loading || Boolean(error)}
  onClick={() => {
    if (firstIncident && !loading && !error) {
      onFocusIncident(firstIncident);
    }
  }}
  title={
    firstIncident && !loading && !error
      ? "Show current incident on map"
      : "No selectable incident"
  }
>
        <span
          className={
            error
              ? "badge error"
              : loading
                ? "badge loading"
                : "badge"
          }
        >
          {error
            ? "NOTICE"
            : loading
              ? "SYNCING"
              : "LIVE"}
        </span>

        <span className="ticker-text">
          {tickerText}
        </span>

        <span className="info">
          {cameraCount} CAMERAS
        </span>
      </button>

      <div className="layers">
        <button
          type="button"
          className={
            showCameras
              ? "layer-toggle active"
              : "layer-toggle"
          }
          onClick={onToggleCameras}
          aria-pressed={showCameras}
        >
          <Camera size={15} />
          Cameras
        </button>

        <button
          type="button"
          className={
            showIncidents
              ? "layer-toggle active"
              : "layer-toggle"
          }
          onClick={onToggleIncidents}
          aria-pressed={showIncidents}
        >
          <MapPin size={15} />
          Incidents
        </button>

        <button
          type="button"
          className={
            showTransit
              ? "layer-toggle active"
              : "layer-toggle"
          }
          onClick={onToggleTransit}
          aria-pressed={showTransit}
        >
          <MapPin size={15} />
          Transit
        </button>

        <span className="refresh-status">
          <RefreshCw size={15} />
          10-minute refresh 
            {showTransit
    ? ` ${transitCount} transit vehicles`
    : "Transit off"}
        </span>
      </div>
    </section>
  );
}

export default TrafficBottomBar;