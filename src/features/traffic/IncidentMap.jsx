import { useEffect, useRef } from "react";
import {
  Map as MapLibreMap,
  NavigationControl,
  Popup,
} from "maplibre-gl";

import useCTrainStations from "./useCTrainStations";

const TRANSIT_ANIMATION_MS = 10 * 60 * 1000;

function createCameraIcon() {
  const size = 36;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");

  context.beginPath();
  context.arc(
    size / 2,
    size / 2,
    size / 2 - 2,
    0,
    Math.PI * 2
  );

  context.fillStyle = "#075985";
  context.fill();

  context.lineWidth = 3;
  context.strokeStyle = "#ffffff";
  context.stroke();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(9, 13, 18, 13, 3);
  context.fill();

  context.beginPath();
  context.arc(18, 19.5, 4, 0, Math.PI * 2);
  context.fillStyle = "#075985";
  context.fill();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(14, 10, 8, 4, 1);
  context.fill();

  return context.getImageData(0, 0, size, size);
}

function createTransitArrowIcon() {
  const size = 48;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;

  const context = canvas.getContext("2d");
  context.clearRect(0, 0, size, size);

  context.beginPath();
  context.moveTo(24, 4);
  context.lineTo(40, 40);
  context.lineTo(24, 31);
  context.lineTo(8, 40);
  context.closePath();

  context.fillStyle = "#16a34a";
  context.fill();

  context.lineWidth = 2.5;
  context.strokeStyle = "#ffffff";
  context.stroke();

  return context.getImageData(0, 0, size, size);
}

function createCTrainStationIcon(
  backgroundColor
) {
  const size = 48;
  const canvas =
    document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  const context =
    canvas.getContext("2d");

  context.clearRect(0, 0, size, size);

  context.beginPath();
  context.roundRect(6, 6, 36, 36, 10);
  context.fillStyle = backgroundColor;
  context.fill();

  context.lineWidth = 3;
  context.strokeStyle = "#ffffff";
  context.stroke();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.roundRect(14, 16, 20, 14, 3);
  context.fill();

  context.fillStyle = backgroundColor;
  context.beginPath();
  context.roundRect(17, 19, 5, 5, 1);
  context.fill();

  context.beginPath();
  context.roundRect(26, 19, 5, 5, 1);
  context.fill();

  context.fillStyle = "#ffffff";
  context.beginPath();
  context.arc(19, 33, 2.5, 0, Math.PI * 2);
  context.fill();

  context.beginPath();
  context.arc(29, 33, 2.5, 0, Math.PI * 2);
  context.fill();

  return context.getImageData(
    0,
    0,
    size,
    size
  );
}

function IncidentMap({
  incidents,
  cameras,
  transitVehicles,
  showCameras,
  showIncidents,
  showTransit,
  focusIncident,
  onFocusClear,
  onCameraSelect,
}) {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const onCameraSelectRef = useRef(onCameraSelect);
  const camerasRef = useRef(cameras);
  const previousTransitTargetsRef = useRef(new Map());
  const lastTransitRefreshRef = useRef(null);
  
  const mapReadyRef = useRef(false);

  const arrivalsByStopId = {};

  const ctrainStations = useCTrainStations();

const stationFeatures = (ctrainStations || [])
  .map((station) => {
    const lng = Number(station.longitude ?? station.lng ?? station.long);
    const lat = Number(station.latitude ?? station.lat);

    return { station, lng, lat };
  })
  .filter(({ lng, lat }) => Number.isFinite(lng) && Number.isFinite(lat))
  .map(({ station, lng, lat }) => {
    const arrivalInfo =
      arrivalsByStopId[String(station.stopId)] || {
        nextArrivals: [],
        status: "unknown",
      };

    const nextArrivals = Array.isArray(arrivalInfo.nextArrivals)
      ? arrivalInfo.nextArrivals
      : [];

    const nextArrival = nextArrivals[0];

    return {
      type: "Feature",
      properties: {
        stopId: String(station.stopId || ""),
        name: String(station.name || "CTrain station"),
        line: String(station.line || "unknown"),
        nextMinutes: Number.isFinite(Number(nextArrival?.minutes))
          ? Number(nextArrival.minutes)
          : -1,
        nextDestination: String(nextArrival?.destination || ""),
        arrivalCount: nextArrivals.length,
        status: String(arrivalInfo.status || "unknown"),
      },
      geometry: {
        type: "Point",
        coordinates: [lng, lat],
      },
    };
  });

console.log("Raw ctrainStations data:", ctrainStations);
console.log("Filtered stationFeatures count:", stationFeatures.length);

  useEffect(() => {
    onCameraSelectRef.current = onCameraSelect;
  }, [onCameraSelect]);

  useEffect(() => {
    camerasRef.current = cameras;
  }, [cameras]);

  useEffect(() => {
    if (mapInstance.current) {
      return;
    }

    const map = new MapLibreMap({
      container: mapContainer.current,
      style:
        "https://tiles.openfreemap.org/styles/liberty",
      center: [-114.0719, 51.0447],
      zoom: 10.8,
    });

    mapInstance.current = map;

    map.addControl(
      new NavigationControl({
        showCompass: false,
      }),
      "top-left"
    );

    map.on("load", () => {
      mapReadyRef.current = true;
      map.addImage(
        "camera-icon",
        createCameraIcon()
      );

      map.addImage(
        "transit-direction-arrow",
        createTransitArrowIcon()
      );

     map.addImage(
  "ctrain-station-red",
  createCTrainStationIcon("#dc2626")
);

map.addImage(
  "ctrain-station-blue",
  createCTrainStationIcon("#1d4ed8")
);

map.addImage(
  "ctrain-station-both",
  createCTrainStationIcon("#7c3aed")
);

map.addImage(
  "ctrain-station-unknown",
  createCTrainStationIcon("#64748b")
);

      map.addSource("incidents", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addSource("focused-incident", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "focused-incident-ring",
        type: "circle",
        source: "focused-incident",
        paint: {
          "circle-radius": 16,
          "circle-color":
            "rgba(240, 106, 115, 0.25)",
          "circle-stroke-color": "#f06a73",
          "circle-stroke-width": 3,
        },
      });

      map.addSource("cameras", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 55,
      });

      map.addLayer({
        id: "camera-clusters",
        type: "circle",
        source: "cameras",
        filter: ["has", "point_count"],
        paint: {
          "circle-color": "#075985",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            18,
            10,
            22,
            30,
            28,
          ],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
      });

      map.addLayer({
        id: "camera-cluster-count",
        type: "symbol",
        source: "cameras",
        filter: ["has", "point_count"],
        layout: {
          "text-field":
            "{point_count_abbreviated}",
          "text-font": ["Open Sans Bold"],
          "text-size": 12,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.addLayer({
        id: "camera-unclustered",
        type: "symbol",
        source: "cameras",
        filter: [
          "!",
          ["has", "point_count"],
        ],
        layout: {
          "icon-image": "camera-icon",
          "icon-size": 0.72,
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
      });

      map.addSource("transit", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "transit",
        type: "circle",
        source: "transit",
        paint: {
          "circle-radius": 7,
          "circle-color": "#22c55e",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 2,
        },
        filter: [
  "all",
  ["to-boolean", ["get", "hasDirection"]],
  ["!", ["to-boolean", ["get", "isTrain"]]],
],
      });

      map.addLayer({
        id: "transit-direction-layer",
        type: "symbol",
        source: "transit",
        layout: {
          "icon-image":
            "transit-direction-arrow",
          "icon-size": 0.55,
          "icon-rotate": [
            "get",
            "bearing",
          ],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
          "icon-ignore-placement": true,
        },
       filter: [
  "all",
  ["to-boolean", ["get", "hasDirection"]],
  ["!", ["to-boolean", ["get", "isTrain"]]],
],
      });

      map.addLayer({
        id: "transit-route-number",
        type: "symbol",
        source: "transit",
        layout: {
          "text-field": [
            "get",
            "routeNumber",
          ],
          "text-size": 11,
          "text-font": ["Open Sans Bold"],
          "text-offset": [0, 1.35],
          "text-anchor": "top",
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-halo-color": "#166534",
          "text-halo-width": 1.5,
        },
        filter: [
          "to-boolean",
          ["get", "hasDirection"],
        ],
      });

      map.addLayer({
        id: "incidents",
        type: "circle",
        source: "incidents",
        paint: {
          "circle-radius": 15,
          "circle-color": "#dc2626",
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 3,
          "circle-opacity": 1,
        },
      });

      map.addLayer({
        id: "incident-symbol",
        type: "symbol",
        source: "incidents",
        layout: {
          "text-field": "!",
          "text-size": 18,
          "text-allow-overlap": true,
          "text-ignore-placement": true,
        },
        paint: {
          "text-color": "#ffffff",
        },
      });

      map.addSource("ctrain-stations", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
  id: "ctrain-stations-layer",
  type: "symbol",
  source: "ctrain-stations",
  layout: {
    "icon-image": [
      "match",
      ["get", "line"],
      "201",
      "ctrain-station-red",
      "202",
      "ctrain-station-blue",
      "both",
      "ctrain-station-both",
      "ctrain-station-unknown",
    ],
    "icon-size": 0.55,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  },
});

map.addLayer({
  id: "ctrain-station-arrivals",
  type: "symbol",
  source: "ctrain-stations",
  layout: {
    "text-field": [
      "case",
      ["==", ["get", "nextMinutes"], null],
      "—",
      [
        "concat",
        ["to-string", ["get", "nextMinutes"]],
        " min",
      ],
    ],
    "text-size": 11,
    "text-offset": [0, 1.8],
    "text-allow-overlap": true,
  },
  paint: {
    "text-color": "#111827",
    "text-halo-color": "#ffffff",
    "text-halo-width": 2,
  },
});

// Add inside map.on("load") alongside bus layers
map.addLayer({
  id: "ctrain-vehicles-layer",
  type: "circle",
  source: "transit",
  filter: ["to-boolean", ["get", "isTrain"]],
  paint: {
    "circle-radius": 8,
    "circle-color": [
      "match",
      ["get", "line"],
      "201", "#dc2626", // Red Line
      "202", "#1d4ed8", // Blue Line
      "#7c3aed"
    ],
    "circle-stroke-color": "#ffffff",
    "circle-stroke-width": 2.5,
  },
});

      map.on("click", async (event) => {
        const features =
          map.queryRenderedFeatures(
            event.point,
            {
              layers: [
                "camera-unclustered",
                "camera-clusters",
                "camera-cluster-count",
              ],
            }
          );

        const feature = features[0];

        if (!feature) {
          return;
        }

        if (
          feature.layer.id ===
            "camera-clusters" ||
          feature.layer.id ===
            "camera-cluster-count"
        ) {
          const clusterId =
            feature.properties?.cluster_id;

          const source = map.getSource(
            "cameras"
          );

          if (
            !source ||
            clusterId === undefined
          ) {
            return;
          }

          source.getClusterExpansionZoom(
            clusterId,
            (error, zoom) => {
              if (error) {
                console.error(error);
                return;
              }

              map.easeTo({
                center:
                  feature.geometry
                    .coordinates,
                zoom,
                duration: 500,
              });
            }
          );

          return;
        }

        const clickedId =
          feature.properties?.id;

        const camera =
          camerasRef.current.find(
            (item) =>
              String(item.id) ===
              String(clickedId)
          ) ?? {
            id: feature.properties?.id,
            name: feature.properties?.name,
            location:
              feature.properties?.location,
            image:
              feature.properties?.image,
            directImageUrl:
              feature.properties?.directImageUrl,
            officialUrl:
              feature.properties?.officialUrl,
            longitude:
              feature.geometry
                .coordinates[0],
            latitude:
              feature.geometry
                .coordinates[1],
          };

        onCameraSelectRef.current(camera);
      });

      map.on("mousemove", (event) => {
        const features =
          map.queryRenderedFeatures(
            event.point,
            {
              layers: [
                "camera-unclustered",
                "camera-clusters",
                "camera-cluster-count",
              ],
            }
          );

        map.getCanvas().style.cursor =
          features.length > 0
            ? "pointer"
            : "";
      });

      map.on("click", "incidents", (event) => {
        const feature =
          event.features?.[0];

        if (!feature) return;

        const properties =
          feature.properties ?? {};

        new Popup()
          .setLngLat(event.lngLat)
          .setHTML(`
            <div class="incident-popup">
              <div class="incident-popup-title">
                ${
                  properties.title ||
                  "Traffic incident"
                }
              </div>
              <div class="incident-popup-description">
                ${
                  properties.description ||
                  "No additional details available."
                }
              </div>
            </div>
          `)
          .addTo(map);
      });

      map.on(
        "mouseenter",
        "incidents",
        () => {
          map.getCanvas().style.cursor =
            "pointer";
        }
      );

      map.on(
        "mouseleave",
        "incidents",
        () => {
          map.getCanvas().style.cursor = "";
        }
      );

      map.on(
        "click",
        [
          "transit",
          "transit-direction-layer",
        ],
        (event) => {
          const feature =
            event.features?.[0];

          if (!feature) return;

          const properties =
            feature.properties;

          const coordinates =
            feature.geometry.coordinates.slice();

          const routeName =
            properties.routeName ||
            properties.routeId ||
            (properties.tripId
              ? `Trip ${properties.tripId}`
              : "Route unavailable");

          const vehicleId =
            properties.vehicleId ||
            "Unknown vehicle";

          const bearing = Number(
            properties.bearing || 0
          );

          const direction =
            bearing >= 337.5 ||
            bearing < 22.5
              ? "North"
              : bearing >= 22.5 &&
                bearing < 67.5
                ? "Northeast"
                : bearing >= 67.5 &&
                  bearing < 112.5
                  ? "East"
                  : bearing >= 112.5 &&
                    bearing < 157.5
                    ? "Southeast"
                    : bearing >= 157.5 &&
                      bearing < 202.5
                      ? "South"
                      : bearing >= 202.5 &&
                        bearing < 247.5
                        ? "Southwest"
                        : bearing >= 247.5 &&
                          bearing < 292.5
                          ? "West"
                          : "Northwest";

          const lastSeen =
            properties.timestamp
              ? new Date(
                  properties.timestamp
                ).toLocaleTimeString([], {
                  hour: "numeric",
                  minute: "2-digit",
                })
              : "Unknown";

          new Popup({
            closeButton: true,
            closeOnClick: true,
          })
            .setLngLat(coordinates)
            .setHTML(`
              <div class="transit-popup">
                <strong>Calgary Transit</strong>
                <div>Route: ${routeName}</div>
                <div>Vehicle: ${vehicleId}</div>
                <div>Direction: ${direction}</div>
                <div>Last seen: ${lastSeen}</div>
              </div>
            `)
            .addTo(map);
        }
      );

      map.on(
        "click",
        "ctrain-stations-layer",
        (event) => {
          const feature =
            event.features?.[0];

          if (!feature) return;

          const properties =
            feature.properties || {};

           const arrivalCount = Number(
  properties.arrivalCount || 0
);

const nextMinutes = Number(
  properties.nextMinutes
);

const arrivalHtml =
  arrivalCount > 0 &&
  Number.isFinite(nextMinutes) &&
  nextMinutes >= 0
    ? `<div>Next train: ${nextMinutes} min</div>`
    : "<div>No upcoming realtime arrivals</div>";
    

          new Popup()
            .setLngLat(
              feature.geometry.coordinates
            )
            .setHTML(`
              <div class="ctrain-popup">
                <strong>CTrain Station</strong>
                <div>
                  ${
                    properties.name ||
                    "Unknown station"
                  }
                </div>
                <div>Line: ${properties.line}</div>
                <div>
                   ${arrivalHtml}
                </div>
              </div>
            `)
            .addTo(map);
        }
      );

      [
        "transit",
        "transit-direction-layer",
        "ctrain-stations-layer",
      ].forEach((layerId) => {
        map.on(
          "mouseenter",
          layerId,
          () => {
            map.getCanvas().style.cursor =
              "pointer";
          }
        );

        map.on(
          "mouseleave",
          layerId,
          () => {
            map.getCanvas().style.cursor =
              "";
          }
        );
      });
    });

    return () => {
      mapReadyRef.current = false;
      map.remove();
      mapInstance.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapInstance.current;

    if (!map) return;

    const updateIncidentSource = () => {
      const source = map.getSource(
        "incidents"
      );

      if (!source) return;

      const visibleIncidents =
        showIncidents ? incidents : [];

      source.setData({
        type: "FeatureCollection",
        features: visibleIncidents
          .filter(
            (incident) =>
              Number.isFinite(
                incident.longitude
              ) &&
              Number.isFinite(
                incident.latitude
              )
          )
          .map((incident) => ({
            type: "Feature",
            properties: {
              title: incident.title,
              description:
                incident.description,
            },
            geometry: {
              type: "Point",
              coordinates: [
                incident.longitude,
                incident.latitude,
              ],
            },
          })),
      });
    };

    if (map.isStyleLoaded()) {
      updateIncidentSource();
    } else {
      map.once("load", updateIncidentSource);
    }
  }, [incidents, showIncidents]);

  useEffect(() => {
    const map = mapInstance.current;

    if (!map || !focusIncident) return;

    if (
      !Number.isFinite(
        focusIncident.longitude
      ) ||
      !Number.isFinite(
        focusIncident.latitude
      )
    ) {
      return;
    }

    map.easeTo({
      center: [
        focusIncident.longitude,
        focusIncident.latitude,
      ],
      zoom: 13,
      duration: 900,
    });

    const timeout = setTimeout(() => {
      onFocusClear?.();
    }, 1000);

    return () => {
      clearTimeout(timeout);
    };
  }, [focusIncident, onFocusClear]);

  useEffect(() => {
    const map = mapInstance.current;

    if (!map) return;

    const updateCameraSource = () => {
      const source = map.getSource(
        "cameras"
      );

      if (!source) return;

      const visibleCameras =
        showCameras ? cameras : [];

      source.setData({
        type: "FeatureCollection",
        features: visibleCameras
          .filter(
            (camera) =>
              Number.isFinite(
                camera.longitude
              ) &&
              Number.isFinite(
                camera.latitude
              )
          )
          .map((camera) => ({
            type: "Feature",
            properties: {
              id: camera.id,
              name: camera.name,
              location: camera.location,
              image: camera.image,
              directImageUrl:
                camera.directImageUrl,
              officialUrl:
                camera.officialUrl,
            },
            geometry: {
              type: "Point",
              coordinates: [
                camera.longitude,
                camera.latitude,
              ],
            },
          })),
      });
    };

    if (map.isStyleLoaded()) {
      updateCameraSource();
    } else {
      map.once("load", updateCameraSource);
    }
  }, [cameras, showCameras]);

  useEffect(() => {
    const map = mapInstance.current;

    if (!map) return;

    const updateFocusSource = () => {
      const source = map.getSource(
        "focused-incident"
      );

      if (!source) return;

      const features =
        focusIncident &&
        Number.isFinite(
          focusIncident.longitude
        ) &&
        Number.isFinite(
          focusIncident.latitude
        )
          ? [
              {
                type: "Feature",
                properties: {},
                geometry: {
                  type: "Point",
                  coordinates: [
                    focusIncident.longitude,
                    focusIncident.latitude,
                  ],
                },
              },
            ]
          : [];

      source.setData({
        type: "FeatureCollection",
        features,
      });
    };

    if (map.isStyleLoaded()) {
      updateFocusSource();
    } else {
      map.once("load", updateFocusSource);
    }
  }, [focusIncident]);

  useEffect(() => {
  const map = mapInstance.current;

  if (!map || !mapReadyRef.current) {
    return;
  }

  let animationFrameId = null;

  const updateTransitSource = () => {
    const source = map.getSource("transit");

    if (!source) return;

    const now = performance.now();
    const previousRefresh =
      lastTransitRefreshRef.current;

    const refreshIntervalMs = previousRefresh
      ? now - previousRefresh
      : TRANSIT_ANIMATION_MS;

    lastTransitRefreshRef.current = now;

    const animationDurationMs = Math.max(
      5000,
      refreshIntervalMs
    );

    const targetFeatures = showTransit
      ? transitVehicles
          .filter(
            (vehicle) =>
              Number.isFinite(
                Number(vehicle.longitude)
              ) &&
              Number.isFinite(
                Number(vehicle.latitude)
              )
          )
          .map((vehicle) => {
            const vehicleId = String(
              vehicle.vehicleId || vehicle.id
            );

            const target = [
              Number(vehicle.longitude),
              Number(vehicle.latitude),
            ];

            const previous =
              previousTransitTargetsRef.current.get(
                vehicleId
              ) || target;

            const routeNumber =
              vehicle.routeName?.split(" — ")[0] ||
              vehicle.routeId?.split("-")[0] ||
              "";

            return {
              type: "Feature",
              id: vehicleId,
              properties: {
                id: vehicleId,
                vehicleId,
                routeId: String(
                  vehicle.routeId || ""
                ),
                routeName: String(
                  vehicle.routeName || ""
                ),
                routeNumber: String(
                  routeNumber
                ),
                tripId: String(
                  vehicle.tripId || ""
                ),
                bearing: Number(
                  vehicle.bearing ?? 0
                ),
                hasDirection:
                  Number.isFinite(
                    Number(vehicle.bearing)
                  ),
                timestamp: String(
                  vehicle.timestamp || ""
                ),
              },
              geometry: {
                type: "Point",
                coordinates: target,
              },
              previousCoordinates: previous,
            };
          })
      : [];

    const startTime = performance.now();

    const animateTransit = () => {
      const progress = Math.min(
        (performance.now() - startTime) /
          animationDurationMs,
        1
      );

      const animatedFeatures =
        targetFeatures.map((feature) => {
          const previous =
            feature.previousCoordinates;

          const target =
            feature.geometry.coordinates;

          return {
            type: "Feature",
            id: feature.id,
            properties: feature.properties,
            geometry: {
              type: "Point",
              coordinates: [
                previous[0] +
                  (target[0] - previous[0]) *
                    progress,
                previous[1] +
                  (target[1] - previous[1]) *
                    progress,
              ],
            },
          };
        });

      source.setData({
        type: "FeatureCollection",
        features: animatedFeatures,
      });

      if (progress < 1) {
        animationFrameId =
          requestAnimationFrame(
            animateTransit
          );
      }
    };

    animationFrameId =
      requestAnimationFrame(
        animateTransit
      );

    targetFeatures.forEach((feature) => {
      previousTransitTargetsRef.current.set(
        String(feature.properties.vehicleId),
        feature.geometry.coordinates
      );
    });
  };

  updateTransitSource();

  return () => {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
    }
  };
}, [showTransit, transitVehicles]);

 useEffect(() => {
  const map = mapInstance.current;

  if (!map) return;

  const updateStations = () => {
    const source = map.getSource(
      "ctrain-stations"
    );

    if (!source) {
      console.warn(
        "CTrain source is not ready"
      );
      return;
    }

    source.setData({
      type: "FeatureCollection",
      features: stationFeatures,
    });

    console.log(
      "CTrain stations rendered:",
      stationFeatures.length
    );
  };

  if (mapReadyRef.current) {
    updateStations();
  } else {
    map.once("load", updateStations);
  }

  return () => {
    map.off("load", updateStations);
  };
}, [stationFeatures]);

  
  return (
    <div ref={mapContainer} className="map" />
  );
}

export default IncidentMap;