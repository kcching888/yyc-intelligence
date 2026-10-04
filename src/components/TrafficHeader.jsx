import {
  Camera,
  Menu,
} from "lucide-react";

function TrafficHeader({
  corridorCounts,
  cameraCount,
  cameraCorridor,
  updatedText,
  loading,
  refreshing,
  error,
  lastUpdated,
  onRefresh,
  onCorridorClick,
}) {
  return (
    <header className="topbar">
      <div className="brand card">
        <div className="brand-title">CALGARY</div>

        <div className="brand-sub">
          TRAFFIC INTELLIGENCE
        </div>

        <div
          className={
            error
              ? "live feed-error"
             : loading || refreshing
        ? "live feed-loading"
        : "live"
          }
        >
          <span className="feed-dot" aria-hidden="true">
            ●
          </span>

          <strong>
            {error
              ? "FEED ISSUE"
              : loading
                ? "LOADING"
        : refreshing
          ? "REFRESHING"
          : "LIVE"}
          </strong>

          <span>
    {lastUpdated
      ? `Updated ${lastUpdated.toLocaleTimeString(
          [],
          {
            hour: "numeric",
            minute: "2-digit",
          }
        )}`
      : "Awaiting first update"}
  </span>
        </div>
      </div>

      <div className="languages card">
        <span className="active">EN</span>
        <span>中</span>
        <span>FR</span>
      </div>

      {corridorCounts.map((corridor) => {
        const hasIncident = corridor.count > 0;
        const isClickable = hasIncident && !loading && !error;

        return (
         <button
  type="button"
  key={corridor.name}
  className={
    isClickable
      ? "card corridor corridor-button"
      : "card corridor corridor-button disabled"
  }
  disabled={!isClickable}
  onClick={() => {
    if (isClickable) {
      onCorridorClick(corridor.name);
    }
  }}
  title={
    error
      ? "Traffic feed unavailable"
      : loading
        ? "Loading traffic incidents"
        : hasIncident
          ? `Show incidents on ${corridor.name}`
          : `No current incidents on ${corridor.name}`
  }
>
            <div className="label">{corridor.name}</div>

       <div
  className={
    error
      ? "state amber"
      : loading
        ? "state amber"
        : corridor.count
          ? "state red"
          : `state ${corridor.color}`
  }
>
  ●{" "}
  {error
    ? "Feed issue"
    : loading
      ? "Loading"
      : corridor.count
        ? "Incident"
        : "Clear"}
</div>

 <div className="speed">
  {error
    ? "Unavailable"
    : loading
      ? "Checking"
      : `${corridor.count} incident${
          corridor.count === 1 ? "" : "s"
        }`}
</div>

            <div className="bar">
              <span
                className={
                  corridor.count
                    ? "red"
                    : corridor.color
                }
              />
            </div>

            <div className="small">
              City traffic feed
            </div>
          </button>
        );
      })}

      <div className="card weather">
        <div className="label">CAMERAS</div>

        <div className="weather-main">
          <Camera size={19} />
          {cameraCount}
        </div>

        <div className="state green">
          Live locations
        </div>

        <div className="small">
          {cameraCorridor === "all"
            ? "All camera locations"
            : `${cameraCorridor} cameras`}
        </div>
      </div>

     <button
  type="button"
  className="menu"
  onClick={() => {
    refresh(true);
  }}
  title={
    refreshing
      ? "Refreshing feeds"
      : "Refresh feeds"
  }
  aria-label="Refresh traffic feeds"
>
  <Menu size={20} />
</button>
    </header>
  );
}

export default TrafficHeader;