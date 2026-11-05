import { useEffect, useRef, useState } from "react";
import {
  Compass,
  Footprints,
  Info,
  Layers,
  Locate,
  MapPin,
  Maximize2,
  Minimize2,
  RotateCcw,
  TrainFront,
  Bus,
  ZoomIn,
  ZoomOut,
  Sparkles,
} from "lucide-react";
import type {
  JourneyStop,
  MultimodalJourneyOption,
  TransportMode,
} from "@/lib/transit/multimodal-types";
import { CHENNAI_STATION_COORDS } from "@/lib/transit/multimodal-planner";
import type * as L from "leaflet";

interface JourneyMapProps {
  option: MultimodalJourneyOption;
  alternatives?: MultimodalJourneyOption[];
  onSelectAlternative?: (optionId: string) => void;
}

export function JourneyMap({ option, alternatives = [], onSelectAlternative }: JourneyMapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const routeLayersRef = useRef<L.Layer[]>([]);
  const markerLayersRef = useRef<L.Layer[]>([]);

  const [isLeafletReady, setIsLeafletReady] = useState(false);
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedMarkerStop, setSelectedMarkerStop] = useState<{
    name: string;
    mode: TransportMode;
    lineName: string;
    arrival?: string;
    isBoard?: boolean;
    isAlight?: boolean;
    instruction?: string;
  } | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Initialize Leaflet Map on mount
  useEffect(() => {
    let isMounted = true;

    async function initLeaflet() {
      if (typeof window === "undefined" || !mapContainerRef.current) return;

      try {
        const L = (await import("leaflet")).default;

        // Inject leaflet CSS if not already present
        if (!document.getElementById("leaflet-css")) {
          const link = document.createElement("link");
          link.id = "leaflet-css";
          link.rel = "stylesheet";
          link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
          document.head.appendChild(link);
        }

        if (!mapInstanceRef.current && mapContainerRef.current && isMounted) {
          // Initialize map with CartoDB Dark Matter tiles (premium dark mode transit tiles)
          const map = L.map(mapContainerRef.current, {
            center: [13.0827, 80.2707], // Chennai
            zoom: 12,
            zoomControl: false,
            attributionControl: false,
          });

          L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
            maxZoom: 19,
            subdomains: "abcd",
          }).addTo(map);

          // Custom attribution
          L.control
            .attribution({ position: "bottomright", prefix: false })
            .addAttribution(
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" class="text-[#00D6A3]">OpenStreetMap</a> &copy; CARTO',
            )
            .addTo(map);

          mapInstanceRef.current = map;
          setIsLeafletReady(true);
        }
      } catch (err) {
        console.warn("Leaflet initialization caught:", err);
      }
    }

    initLeaflet();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Render Route and Markers whenever selected option or Leaflet status changes
  useEffect(() => {
    if (!isLeafletReady || !mapInstanceRef.current) return;

    let isSubscribed = true;

    async function drawRoutes() {
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;
      if (!map || !isSubscribed) return;

      // Clean up existing layers
      routeLayersRef.current.forEach((layer) => map.removeLayer(layer));
      markerLayersRef.current.forEach((marker) => map.removeLayer(marker));
      routeLayersRef.current = [];
      markerLayersRef.current = [];

      const allLatLngs: [number, number][] = [];

      // 1. Draw alternative routes in dimmed lines if available
      if (alternatives && alternatives.length > 1) {
        alternatives.forEach((alt) => {
          if (alt.id === option.id) return;
          const altLatLngs: [number, number][] = [];

          alt.legs.forEach((leg) => {
            leg.intermediateStops.forEach((stop) => {
              const coords =
                stop.latitude && stop.longitude
                  ? { lat: stop.latitude, lon: stop.longitude }
                  : CHENNAI_STATION_COORDS[stop.name];
              if (coords) {
                altLatLngs.push([coords.lat, coords.lon]);
              }
            });
          });

          if (altLatLngs.length >= 2) {
            const dimLine = L.polyline(altLatLngs, {
              color: "#64748B",
              weight: 3,
              opacity: 0.35,
              dashArray: "4, 6",
            }).addTo(map);

            dimLine.on("click", () => {
              if (onSelectAlternative) {
                onSelectAlternative(alt.id);
              }
            });

            routeLayersRef.current.push(dimLine);
          }
        });
      }

      // 2. Draw selected route legs
      option.legs.forEach((leg, legIdx) => {
        const legLatLngs: [number, number][] = [];

        leg.intermediateStops.forEach((stop) => {
          const coords =
            stop.latitude && stop.longitude
              ? { lat: stop.latitude, lon: stop.longitude }
              : CHENNAI_STATION_COORDS[stop.name];
          if (coords) {
            legLatLngs.push([coords.lat, coords.lon]);
            allLatLngs.push([coords.lat, coords.lon]);
          }
        });

        if (legLatLngs.length >= 2) {
          const isWalk = leg.mode === "walk";
          let color = leg.color || "#00D6A3";

          if (leg.mode === "metro") {
            if (leg.lineName.toLowerCase().includes("yellow")) color = "#EAB308";
            else if (leg.lineName.toLowerCase().includes("green")) color = "#10B981";
            else color = "#3985FF";
          } else if (leg.mode === "bus") {
            color = "#FFAA47";
          } else if (leg.mode === "train") {
            color = "#A78BFA";
          }

          // Glow outline
          const glow = L.polyline(legLatLngs, {
            color,
            weight: isWalk ? 4 : 8,
            opacity: 0.25,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
          routeLayersRef.current.push(glow);

          // Main sharp line
          const poly = L.polyline(legLatLngs, {
            color,
            weight: isWalk ? 2.5 : 4.5,
            opacity: 0.95,
            dashArray: isWalk ? "6, 6" : undefined,
            lineCap: "round",
            lineJoin: "round",
          }).addTo(map);
          routeLayersRef.current.push(poly);
        }
      });

      // 3. Draw Station Markers
      const totalLegs = option.legs.length;

      option.legs.forEach((leg, legIdx) => {
        const stops = leg.intermediateStops;
        stops.forEach((stop, sIdx) => {
          const coords =
            stop.latitude && stop.longitude
              ? { lat: stop.latitude, lon: stop.longitude }
              : CHENNAI_STATION_COORDS[stop.name];
          if (!coords) return;

          const isOrigin = legIdx === 0 && sIdx === 0;
          const isDestination = legIdx === totalLegs - 1 && sIdx === stops.length - 1;
          const isTransfer =
            (sIdx === stops.length - 1 && legIdx < totalLegs - 1) || (sIdx === 0 && legIdx > 0);

          let markerHtml = "";
          let iconSize: [number, number] = [18, 18];

          if (isOrigin) {
            markerHtml = `
              <div class="relative flex items-center justify-center">
                <span class="absolute h-7 w-7 rounded-full bg-[#00D6A3] opacity-50 animate-ping"></span>
                <span class="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#00D6A3] text-[#07111F] text-xs font-black shadow-lg border-2 border-white">
                  A
                </span>
              </div>
            `;
            iconSize = [24, 24];
          } else if (isDestination) {
            markerHtml = `
              <div class="relative flex items-center justify-center">
                <span class="absolute h-7 w-7 rounded-full bg-[#EF4444] opacity-50 animate-ping"></span>
                <span class="relative flex h-6 w-6 items-center justify-center rounded-full bg-[#EF4444] text-white text-xs font-black shadow-lg border-2 border-white">
                  B
                </span>
              </div>
            `;
            iconSize = [24, 24];
          } else if (isTransfer) {
            markerHtml = `
              <div class="flex h-5 w-5 items-center justify-center rounded-full bg-[#101D30] border-2 border-[#00D6A3] shadow-md">
                <div class="h-2 w-2 rounded-full bg-[#00D6A3]"></div>
              </div>
            `;
            iconSize = [20, 20];
          } else {
            let dotColor = "#3985FF";
            if (leg.mode === "bus") dotColor = "#FFAA47";
            else if (leg.mode === "train") dotColor = "#A78BFA";
            else if (leg.lineName.toLowerCase().includes("yellow")) dotColor = "#EAB308";
            else if (leg.lineName.toLowerCase().includes("green")) dotColor = "#10B981";

            markerHtml = `
              <div class="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-[#07111F] border-2 shadow-sm" style="border-color: ${dotColor}">
                <div class="h-1.5 w-1.5 rounded-full" style="background-color: ${dotColor}"></div>
              </div>
            `;
            iconSize = [14, 14];
          }

          const customIcon = L.divIcon({
            html: markerHtml,
            className: "custom-transit-node",
            iconSize,
            iconAnchor: [iconSize[0] / 2, iconSize[1] / 2],
          });

          const marker = L.marker([coords.lat, coords.lon], { icon: customIcon }).addTo(map);

          marker.on("click", () => {
            setSelectedMarkerStop({
              name: stop.name,
              mode: leg.mode,
              lineName: leg.lineName,
              arrival: stop.arrival,
              isBoard: isOrigin,
              isAlight: isDestination,
              instruction: leg.instruction,
            });
          });

          markerLayersRef.current.push(marker);
        });
      });

      // Fit map view to fit all stations on route
      if (allLatLngs.length > 0) {
        map.fitBounds(allLatLngs, {
          padding: [45, 45],
          maxZoom: 15,
        });
      }
    }

    drawRoutes();

    return () => {
      isSubscribed = false;
    };
  }, [isLeafletReady, option, alternatives]);

  // User Geolocation Handler
  const handleLocateMe = () => {
    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }
    setGeoError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords({ lat: latitude, lng: longitude });

        if (mapInstanceRef.current) {
          const L = (await import("leaflet")).default;
          mapInstanceRef.current.setView([latitude, longitude], 14);

          const userIcon = L.divIcon({
            html: `
              <div class="relative flex items-center justify-center">
                <span class="absolute h-6 w-6 rounded-full bg-[#00D6A3] opacity-40 animate-ping"></span>
                <span class="relative flex h-4 w-4 items-center justify-center rounded-full bg-[#00D6A3] border-2 border-white shadow-md"></span>
              </div>
            `,
            className: "user-loc-pin",
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          L.marker([latitude, longitude], { icon: userIcon })
            .addTo(mapInstanceRef.current)
            .bindPopup("<b class='text-black'>Your Location</b>")
            .openPopup();
        }
      },
      (err) => {
        setGeoError("Unable to retrieve location. Please check browser permissions.");
      },
      { timeout: 8000 },
    );
  };

  const handleZoomIn = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.zoomOut();
    }
  };

  const handleReset = () => {
    if (mapInstanceRef.current && option.legs.length > 0) {
      const allLatLngs: [number, number][] = [];
      option.legs.forEach((leg) => {
        leg.intermediateStops.forEach((stop) => {
          const coords =
            stop.latitude && stop.longitude
              ? { lat: stop.latitude, lon: stop.longitude }
              : CHENNAI_STATION_COORDS[stop.name];
          if (coords) allLatLngs.push([coords.lat, coords.lon]);
        });
      });
      if (allLatLngs.length > 0) {
        mapInstanceRef.current.fitBounds(allLatLngs, { padding: [40, 40] });
      }
      setSelectedMarkerStop(null);
    }
  };

  return (
    <div
      className={`relative flex flex-col overflow-hidden rounded-2xl border border-[#1E293B] bg-[#101D30] shadow-soft transition-all ${
        isFullscreen ? "fixed inset-4 z-50 rounded-2xl shadow-2xl" : ""
      }`}
    >
      {/* Map Header Toolbar */}
      <div className="flex flex-wrap items-center justify-between border-b border-[#1E293B] bg-[#0B1524] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Compass className="h-4 w-4 text-[#00D6A3]" />
          <span className="font-display text-xs font-semibold text-white">
            Multimodal Route Map
          </span>
          <span className="rounded-full bg-[#00D6A3]/15 px-2 py-0.5 text-[10px] font-bold text-[#00D6A3] border border-[#00D6A3]/30 truncate max-w-[190px]">
            {option.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleLocateMe}
            className="rounded-lg border border-[#1E293B] bg-[#17263B] p-1.5 text-white hover:bg-[#1E293B] transition"
            title="My Location"
          >
            <Locate className="h-3.5 w-3.5 text-[#00D6A3]" />
          </button>
          <button
            type="button"
            onClick={handleZoomIn}
            className="rounded-lg border border-[#1E293B] bg-[#17263B] p-1.5 text-white hover:bg-[#1E293B] transition"
            title="Zoom In"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="rounded-lg border border-[#1E293B] bg-[#17263B] p-1.5 text-white hover:bg-[#1E293B] transition"
            title="Zoom Out"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="rounded-lg border border-[#1E293B] bg-[#17263B] p-1.5 text-white hover:bg-[#1E293B] transition"
            title="Fit Route Bounds"
          >
            <RotateCcw className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="rounded-lg border border-[#1E293B] bg-[#17263B] p-1.5 text-white hover:bg-[#1E293B] transition"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen Map"}
          >
            {isFullscreen ? (
              <Minimize2 className="h-3.5 w-3.5" />
            ) : (
              <Maximize2 className="h-3.5 w-3.5" />
            )}
          </button>
        </div>
      </div>

      {/* Geolocation feedback alert */}
      {geoError && (
        <div className="bg-[#EF4444]/20 border-b border-[#EF4444]/40 px-3 py-1.5 text-xs text-[#EF4444] text-center">
          {geoError}
        </div>
      )}

      {/* Map Container Area */}
      <div
        className={`relative w-full overflow-hidden bg-[#07111F] ${
          isFullscreen ? "h-[calc(100vh-140px)]" : "h-80 sm:h-96"
        }`}
      >
        <div ref={mapContainerRef} className="h-full w-full" />

        {/* Selected Station Popover Tooltip */}
        {selectedMarkerStop && (
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:max-w-xs rounded-xl border border-[#1E293B] bg-[#101D30]/95 p-3.5 shadow-2xl backdrop-blur animate-rise z-20">
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-1.5 mb-1">
                  {selectedMarkerStop.isBoard && (
                    <span className="rounded bg-[#00D6A3] px-1.5 py-0.2 text-[9px] font-bold text-[#07111F]">
                      BOARDING
                    </span>
                  )}
                  {selectedMarkerStop.isAlight && (
                    <span className="rounded bg-[#EF4444] px-1.5 py-0.2 text-[9px] font-bold text-white">
                      ALIGHTING
                    </span>
                  )}
                  <span className="text-[10px] font-semibold text-[#00D6A3] uppercase tracking-wide">
                    {selectedMarkerStop.lineName}
                  </span>
                </div>

                <h5 className="font-display text-sm font-bold text-white">
                  {selectedMarkerStop.name}
                </h5>

                {selectedMarkerStop.arrival && (
                  <p className="mt-1 text-xs text-[#94A3B8]">
                    Scheduled GTFS Time:{" "}
                    <span className="font-mono text-white font-semibold">
                      {selectedMarkerStop.arrival.slice(0, 5)}
                    </span>
                  </p>
                )}

                {selectedMarkerStop.instruction && (
                  <p className="mt-1.5 text-[11px] text-[#94A3B8]/90 italic border-t border-[#1E293B] pt-1">
                    {selectedMarkerStop.instruction}
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => setSelectedMarkerStop(null)}
                className="text-xs text-[#94A3B8] hover:text-white p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Map Legend & Real-Time Disclaimer Footer */}
      <div className="space-y-2 border-t border-[#1E293B] bg-[#0B1524] px-4 py-2.5 text-xs text-[#94A3B8]">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {/* Mode Legend Colors */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#3985FF]" />
              Metro Blue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              Metro Green
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#EAB308]" />
              Yellow (Corridor 4)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#FFAA47]" />
              MTC Bus
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#A78BFA]" />
              Suburban Rail
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-3 border-b-2 border-dashed border-[#94A3B8]" />
              Walk
            </span>
          </div>

          <span className="text-[11px] text-[#64748B]">Click station dot to inspect</span>
        </div>

        {/* Live Tracking Disclaimer (Transparent & Grounded) */}
        <div className="flex items-start gap-1.5 text-[11px] text-[#64748B] border-t border-[#1E293B]/70 pt-1.5">
          <Info className="h-3.5 w-3.5 text-[#00D6A3] shrink-0 mt-0.2" />
          <span>
            <b>Live Tracking Disclaimer:</b> Routes and stops represent official static GTFS
            timetable data. Real-time GPS bus and train tracking feeds are currently not publicly
            broadcast by CMRL or MTC; vehicle arrival times are estimated from official timetables.
          </span>
        </div>
      </div>
    </div>
  );
}
