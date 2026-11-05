import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Calendar,
  Clock,
  Compass,
  Edit3,
  MapPin,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import type { JourneySearchParams, ModePreference } from "@/lib/transit/multimodal-types";

interface JourneySearchSummaryProps {
  params: JourneySearchParams;
  totalAlternatives: number;
  onUpdateSearch?: (updated: JourneySearchParams) => void;
  isLoading?: boolean;
}

export function JourneySearchSummary({
  params,
  totalAlternatives,
  onUpdateSearch,
  isLoading,
}: JourneySearchSummaryProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [origin, setOrigin] = useState(params.origin);
  const [destination, setDestination] = useState(params.destination);
  const [travelDate, setTravelDate] = useState(
    params.travelDate || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()),
  );
  const [departureTime, setDepartureTime] = useState(params.departureTime || "");
  const [preferredMode, setPreferredMode] = useState<ModePreference>(params.preferredMode || "any");

  useEffect(() => {
    setOrigin(params.origin);
    setDestination(params.destination);
    setTravelDate(params.travelDate || new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date()));
    setDepartureTime(params.departureTime || "");
    setPreferredMode(params.preferredMode || "any");
  }, [params.origin, params.destination, params.travelDate, params.departureTime, params.preferredMode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!origin.trim() || !destination.trim()) return;
    setIsEditing(false);
    onUpdateSearch?.({
      origin: origin.trim(),
      destination: destination.trim(),
      travelDate,
      departureTime,
      preferredMode,
    });
  };

  const handleSwap = () => {
    const newOrigin = destination;
    const newDest = origin;
    setOrigin(newOrigin);
    setDestination(newDest);
    onUpdateSearch?.({
      origin: newOrigin,
      destination: newDest,
      travelDate,
      departureTime,
      preferredMode,
    });
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
      {!isEditing ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-base font-semibold text-foreground">
                {params.origin}
              </span>
              <ArrowRight className="h-4 w-4 text-accent shrink-0" />
              <span className="font-display text-base font-semibold text-foreground">
                {params.destination}
              </span>
              <span className="rounded-full bg-accent-soft px-2.5 py-0.5 text-xs font-semibold text-accent">
                {totalAlternatives}{" "}
                {totalAlternatives === 1 ? "route option" : "route alternatives"}
              </span>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                {params.travelDate || "Today"}
              </span>
              <span>·</span>
              <span className="inline-flex items-center gap-1 font-mono">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                {params.departureTime || "Next available"}
              </span>
              <span>·</span>
              <span className="text-accent font-medium">Multimodal GTFS</span>
              {params.preferredMode && params.preferredMode !== "any" && (
                <>
                  <span>·</span>
                  <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">
                    Preferred:{" "}
                    {params.preferredMode === "metro"
                      ? "Chennai Metro"
                      : params.preferredMode === "bus"
                        ? "MTC Bus"
                        : "Suburban Rail"}
                  </span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSwap}
              title="Reverse origin and destination"
              className="inline-flex items-center justify-center gap-1 rounded-xl border border-input bg-background p-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition"
            >
              <ArrowLeftRight className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-input bg-background px-3 py-2 text-xs font-semibold text-foreground shadow-2xs transition hover:bg-muted"
            >
              <Edit3 className="h-3.5 w-3.5 text-accent" />
              Edit Search
            </button>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-display text-sm font-semibold text-foreground flex items-center gap-1.5">
              <Search className="h-4 w-4 text-accent" /> Edit Journey Query
            </h4>
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium text-muted-foreground">
              Starting From
              <div className="mt-1 flex items-center rounded-xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                <MapPin className="h-3.5 w-3.5 text-accent shrink-0 mr-2" />
                <input
                  type="text"
                  value={origin}
                  onChange={(e) => setOrigin(e.target.value)}
                  placeholder="e.g. Guindy Metro"
                  className="w-full bg-transparent text-sm focus:outline-hidden"
                  required
                />
              </div>
            </label>

            <label className="text-xs font-medium text-muted-foreground">
              Going To
              <div className="mt-1 flex items-center rounded-xl border bg-background px-3 py-2 focus-within:ring-2 focus-within:ring-ring">
                <MapPin className="h-3.5 w-3.5 text-destructive shrink-0 mr-2" />
                <input
                  type="text"
                  value={destination}
                  onChange={(e) => setDestination(e.target.value)}
                  placeholder="e.g. Chennai Airport"
                  className="w-full bg-transparent text-sm focus:outline-hidden"
                  required
                />
              </div>
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-medium text-muted-foreground">
              Date
              <input
                type="date"
                value={travelDate}
                onChange={(e) => setTravelDate(e.target.value)}
                className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="text-xs font-medium text-muted-foreground">
              Departure Time
              <input
                type="time"
                value={departureTime}
                onChange={(e) => setDepartureTime(e.target.value)}
                className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
              />
            </label>

            <label className="text-xs font-medium text-muted-foreground">
              Mode Preference
              <select
                value={preferredMode}
                onChange={(e) => setPreferredMode(e.target.value as ModePreference)}
                className="mt-1 w-full rounded-xl border bg-background px-3 py-2 text-sm focus:outline-hidden focus:ring-2 focus:ring-ring"
              >
                <option value="any">Any Mode (Multimodal)</option>
                <option value="metro">Prefer Metro</option>
                <option value="bus">Prefer MTC Bus</option>
                <option value="train">Prefer Suburban Rail</option>
              </select>
            </label>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="rounded-xl border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !origin.trim() || !destination.trim()}
              className="rounded-xl bg-accent px-4 py-1.5 text-xs font-semibold text-accent-foreground shadow-glow hover:bg-accent/90 disabled:opacity-50"
            >
              {isLoading ? "Recalculating..." : "Update Results"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
