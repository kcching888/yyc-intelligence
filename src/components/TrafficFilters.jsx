import { Camera } from "lucide-react";

function TrafficFilters({
  corridors,
  selectedCorridor,
  search,
  cameraCount,
  isOpen,
  onToggle,
  onCorridorChange,
  onSearchChange,
}) {
  return (
    <div className="camera-filter-panel">
      <div className="camera-filter-heading">
        <div className="camera-filter-title">
          <Camera size={15} />
          <span>Camera filters</span>
        </div>

        <button
          type="button"
          className="camera-filter-toggle"
          onClick={onToggle}
          aria-expanded={isOpen}
          aria-label={
            isOpen
              ? "Collapse camera filters"
              : "Expand camera filters"
          }
        >
          {isOpen ? "−" : "+"}
        </button>
      </div>

      {isOpen && (
        <>
          <div className="camera-filter-buttons">
            {corridors.map((corridor) => (
              <button
                key={corridor.id}
                type="button"
                className={
                  selectedCorridor === corridor.id
                    ? "camera-filter active"
                    : "camera-filter"
                }
                onClick={() => onCorridorChange(corridor.id)}
              >
                {corridor.label}
              </button>
            ))}
          </div>

          <input
            className="camera-search"
            type="search"
            value={search}
            onChange={(event) =>
              onSearchChange(event.target.value)
            }
            placeholder="Search camera road"
            aria-label="Search camera road"
          />

          <span className="camera-filter-count">
            {cameraCount} camera
            {cameraCount === 1 ? "" : "s"}
          </span>
        </>
      )}
    </div>
  );
}

export default TrafficFilters;