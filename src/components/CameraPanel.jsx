import { Camera, ExternalLink, MapPin, X } from "lucide-react";
import { useEffect, useState } from "react";

function CameraPanel({ camera, onClose }) {
  const imageSources = [
  camera.directImageUrl,
  camera.image,
].filter(Boolean);

const [imageSourceIndex, setImageSourceIndex] =
  useState(0);

useEffect(() => {
  setImageSourceIndex(0);
}, [camera.id]);

const currentImageSource =
  imageSources[imageSourceIndex];

const hasMoreSources =
  imageSourceIndex < imageSources.length - 1;

  return (
    <aside
      className="camera-popup"
      aria-label={`Camera details for ${camera.name}`}
    >
      <div className="camera-popup-header">
        <div className="popup-title">
          <Camera size={16} />
          <span>{camera.name}</span>
        </div>

        <button
          type="button"
          className="close"
          onClick={onClose}
          aria-label="Close camera details"
        >
          <X size={15} />
        </button>
      </div>

      {camera.location && (
        <div className="camera-location">
          <MapPin size={14} />
          <span>{camera.location}</span>
        </div>
      )}

      <div className="camera-image-wrap">
        {currentImageSource ? (
  <img
    key={currentImageSource}
    src={currentImageSource}
    alt={`Live traffic view: ${camera.name}`}
    onError={() => {
      if (hasMoreSources) {
        setImageSourceIndex(
          (index) => index + 1
        );
      }
    }}
  />
) : (
  <div className="no-image">
    A live preview is unavailable for this camera.
  </div>
)}
      </div>

      <div className="camera-actions">
        <a
          className="official-camera-link"
          href={camera.directImageUrl || camera.officialUrl}
          target="_blank"
          rel="noreferrer"
        >
          <ExternalLink size={14} />
          Open camera image
        </a>

        <a
          className="official-camera-link secondary"
          href={camera.officialUrl}
          target="_blank"
          rel="noreferrer"
        >
          <MapPin size={14} />
          City traffic map
        </a>
      </div>

      <div className="popup-small">
        City of Calgary traffic camera
      </div>
    </aside>
  );
}

export default CameraPanel;