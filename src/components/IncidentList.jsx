import { MapPin, X } from "lucide-react";
import { getTimeAgo } from "../utils/trafficUtils";

function IncidentList({
  incidents,
  corridorName,
  onSelect,
  onClose,
}) {
  return (
    <div className="incident-list card">
      <div className="incident-list-header">
        <div className="incident-list-title">
          <MapPin size={15} />
          {corridorName} incidents
        </div>

        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close incident list"
        >
          <X size={15} />
        </button>
      </div>

      <div className="incident-list-items">
        {incidents.map((incident) => {
          const isRecent =
            incident.updatedDate &&
            Date.now() -
              incident.updatedDate.getTime() <
              30 * 60 * 1000;

          return (
            <button
              type="button"
              key={incident.id}
              className={
                isRecent
                  ? "incident-list-item recent"
                  : "incident-list-item"
              }
              onClick={() => {
                onSelect(incident);
              }}
            >
              <strong>{incident.title}</strong>

              {incident.description && (
                <span>{incident.description}</span>
              )}

              {incident.updatedDate && (
                <small className="incident-time">
                  {incident.incidentType} •{" "}
                  {getTimeAgo(
                    incident.updatedDate
                  )}
                </small>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default IncidentList;