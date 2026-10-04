
export function getPoint(row) {
  let longitude = Number(
    row.longitude ?? row.lon ?? row.lng
  );

  let latitude = Number(
    row.latitude ?? row.lat
  );

  const point =
    row.point ?? row.location ?? row.coordinates;

  if (point && typeof point === "object") {
    longitude = Number(
      point.longitude ??
      point.lon ??
      point.coordinates?.[0] ??
      longitude
    );

    latitude = Number(
      point.latitude ??
      point.lat ??
      point.coordinates?.[1] ??
      latitude
    );
  }

  if (
    !Number.isFinite(longitude) ||
    !Number.isFinite(latitude)
  ) {
    const values =
      String(point || "").match(
        /-?\d+\.\d+/g
      ) || [];

    if (!Number.isFinite(latitude)) {
      latitude = Number(values[0]);
    }

    if (!Number.isFinite(longitude)) {
      longitude = Number(values[1]);
    }
  }

  return {
    longitude,
    latitude,
  };
}


export function normalizeIncident(row, index) {
  const point = getPoint(row);

  const rawUpdated =
    row.last_updated ??
    row.updated_at ??
    row.modified_date ??
    row.created_date ??
    "";

  const updatedDate = rawUpdated
    ? new Date(rawUpdated)
    : null;

  return {
    id: `incident-${row.id || index}`,
    title:
      row.incident_info ||
      row.description ||
      row.incident_type ||
      "Traffic incident",
    description: row.description || "",
    incidentType:
      row.incident_type || "Traffic incident",
    updatedDate:
      updatedDate && !Number.isNaN(updatedDate.getTime())
        ? updatedDate
        : null,
    longitude: point.longitude,
    latitude: point.latitude,
  };
}

export function normalizeCamera(row, index) {
  const cameraText = String(
    row["Camera URL"] || ""
  );

  const imageUrl =
    cameraText.match(
      /https?:\/\/[^)\s]+/i
    )?.[0] || "";

  const name = cameraText
    .replace(
      /\s*\(https?:\/\/[^)]+\)\s*/i,
      ""
    )
    .trim();

  const pointText = String(
    row.Point || ""
  );

  const coordinates =
    pointText.match(/-?\d+\.\d+/g) || [];

  const longitude = Number(coordinates[0]);
  const latitude = Number(coordinates[1]);

  return {
    id: `camera-${index}`,
    name: name || `Camera ${index + 1}`,
    location:
      row["Camera Location"] ||
      row.Quadrant ||
      "",
    directImageUrl: imageUrl,
    image: imageUrl
      ? `/camera-image?url=${encodeURIComponent(
          imageUrl
        )}`
      : "",
    officialUrl:
      "https://maps.calgary.ca/TrafficInformation/",
    longitude,
    latitude,
  };
}

export function getTimeAgo(date) {
  if (!date) return "";

  const milliseconds = Date.now() - date.getTime();

  if (milliseconds < 0) {
    return "Just reported";
  }

  const minutes = Math.floor(
    milliseconds / (1000 * 60)
  );

  if (minutes < 1) {
    return "Just reported";
  }

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours} hr ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days} day${days === 1 ? "" : "s"} ago`;
}