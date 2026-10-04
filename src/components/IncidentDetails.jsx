import { AlertTriangle, X } from "lucide-react";
import { getTimeAgo } from "../utils/trafficUtils";

function IncidentDetails({
  incident,
  onClose,
}) {
  if (!incident) return null;

  return (
    <div className="incident-details card">
      <div className="incident-details-header">
        <div className="incident-details-title">
          <AlertTriangle size={15} />
          Selected incident
        </div>

        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close incident details"
        >
          <X size={15} />
        </button>
      </div>

      <strong className="incident-details-name">
        {incident.title}
      </strong>

      {incident.description && (
        <p className="incident-details-description">
          {incident.description}
        </p>
      )}

   <div className="incident-details-meta">
  {incident.incidentType}
  {incident.updatedDate &&
    ` • ${getTimeAgo(incident.updatedDate)}`}
  <br />
  Lat {incident.latitude.toFixed(4)}, Lng{" "}
  {incident.longitude.toFixed(4)}
</div>
    </div>
  );
}

export default IncidentDetails;