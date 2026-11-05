import {
  Award,
  Bus,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  Footprints,
  Sparkles,
  Ticket,
  TrainFront,
  Zap,
} from "lucide-react";
import type { MultimodalJourneyOption, TransportMode } from "@/lib/transit/multimodal-types";

interface JourneyComparisonCardProps {
  option: MultimodalJourneyOption;
  isSelected: boolean;
  onSelect: () => void;
}

export function JourneyComparisonCard({
  option,
  isSelected,
  onSelect,
}: JourneyComparisonCardProps) {
  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case "metro":
        return <TrainFront className="h-3.5 w-3.5 text-[#3985FF]" />;
      case "bus":
        return <Bus className="h-3.5 w-3.5 text-[#FFAA47]" />;
      case "train":
        return <TrainFront className="h-3.5 w-3.5 text-[#A78BFA]" />;
      case "walk":
        return <Footprints className="h-3 w-3 text-muted-foreground" />;
    }
  };

  const firstLeg = option.legs[0];
  const lastLeg = option.legs[option.legs.length - 1];
  const boardStop =
    option.originStation || firstLeg?.boardStation || firstLeg?.fromStation || "Origin";
  const alightStop =
    option.destinationStation || lastLeg?.alightStation || lastLeg?.toStation || "Destination";

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className={`group relative cursor-pointer rounded-2xl border p-4 transition-all duration-200 text-left ${
        isSelected
          ? "border-accent bg-[#17263B] shadow-lg ring-2 ring-accent/60"
          : "border-border/70 bg-[#17263B]/80 hover:border-accent/40 hover:bg-[#17263B] hover:shadow-soft"
      }`}
    >
      {/* Top Header Strip: Badges */}
      <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
        {option.optionNumber && (
          <span className="rounded-md bg-secondary px-2 py-0.5 text-[11px] font-bold text-foreground font-mono">
            #{option.optionNumber}
          </span>
        )}

        {option.highlights.map((highlight) => {
          if (highlight === "best_overall") {
            return (
              <span
                key="best_overall"
                className="inline-flex items-center gap-1 rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-purple-300 border border-purple-500/20"
              >
                <Award className="h-3 w-3" /> Best Overall
              </span>
            );
          }
          if (highlight === "fastest") {
            return (
              <span
                key="fastest"
                className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-emerald-400 border border-emerald-500/20"
              >
                <Zap className="h-3 w-3" /> Fastest
              </span>
            );
          }
          if (highlight === "cheapest") {
            return (
              <span
                key="cheapest"
                className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-300 border border-amber-500/20"
              >
                <Coins className="h-3 w-3" /> Cheapest
              </span>
            );
          }
          if (highlight === "fewest_transfers") {
            return (
              <span
                key="fewest"
                className="inline-flex items-center gap-1 rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-sky-300 border border-sky-500/20"
              >
                <Sparkles className="h-3 w-3" /> Direct Route
              </span>
            );
          }
          if (highlight === "least_walking") {
            return (
              <span
                key="least_walking"
                className="inline-flex items-center gap-1 rounded-full bg-teal-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-300 border border-teal-500/20"
              >
                <Footprints className="h-3 w-3" /> Least Walking
              </span>
            );
          }
          return null;
        })}

        {isSelected && (
          <span className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-accent">
            <CheckCircle2 className="h-3.5 w-3.5" /> Selected
          </span>
        )}
      </div>

      {/* Main Title & Boarding/Alighting Heading */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground truncate">
            <span className="text-emerald-400">{boardStop}</span>
            <span className="text-muted-foreground/60">→</span>
            <span className="text-rose-400">{alightStop}</span>
          </div>
          <h4 className="mt-1 font-display text-sm font-bold text-foreground truncate">
            {option.title}
          </h4>
          <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{option.description}</p>
        </div>

        <div className="text-right shrink-0">
          <div className="font-display text-xl font-bold tracking-tight text-foreground font-mono tabular-nums">
            {option.scheduleSource === "Timetable unavailable" ? "~" + option.durationMinutes : option.durationMinutes}{" "}
            <span className="text-xs font-medium text-muted-foreground">
              {option.scheduleSource === "Timetable unavailable" ? "min est." : "min"}
            </span>
          </div>
          <div className="text-xs font-bold text-accent font-mono tabular-nums">{option.fare > 0 ? "₹" + option.fare : "Fare unavailable"}</div>
          {option.digitalFare && option.digitalFare < option.fare && (
            <div className="text-[10px] font-mono text-emerald-400">
              ₹{option.digitalFare} digital
            </div>
          )}
        </div>
      </div>

      {/* Mode Sequence Chain */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5 rounded-xl bg-secondary/40 px-2.5 py-1.5 border border-border/40">
        {option.legs.map((leg, idx) => (
          <div key={leg.id || idx} className="flex items-center gap-1 text-xs">
            {idx > 0 && <span className="text-muted-foreground/50">›</span>}
            <span
              className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium ${
                leg.mode === "metro"
                  ? leg.color === "#EAB308" || leg.lineName.toLowerCase().includes("yellow")
                    ? "bg-amber-400/20 text-amber-300 border border-amber-400/30"
                    : leg.color === "#16A34A" || leg.lineName.toLowerCase().includes("green")
                      ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                      : "bg-[#3985FF]/20 text-[#3985FF] border border-[#3985FF]/30"
                  : leg.mode === "bus"
                    ? "bg-[#FFAA47]/20 text-[#FFAA47] border border-[#FFAA47]/30"
                    : leg.mode === "train"
                      ? "bg-[#A78BFA]/20 text-[#A78BFA] border border-[#A78BFA]/30"
                      : "bg-slate-700/40 text-slate-300"
              }`}
            >
              {getModeIcon(leg.mode)}
              {leg.mode === "walk"
                ? `${leg.walkingDistanceMeters || 100}m`
                : leg.routeNumber || leg.lineName}
            </span>
          </div>
        ))}
      </div>

      {/* Key Metrics Strip */}
      <div className="mt-3 grid grid-cols-4 gap-1 border-t border-border/50 pt-2 text-center text-xs text-muted-foreground">
        <div>
          <span className="block font-semibold text-foreground">
            {option.transferCount === 0 ? "Direct" : `${option.transferCount} xfer`}
          </span>
          <span className="text-[10px]">Transfers</span>
        </div>
        <div>
          <span className="block font-semibold text-foreground font-mono tabular-nums">
            {option.totalStops}
          </span>
          <span className="text-[10px]">Stops</span>
        </div>
        <div>
          <span className="block font-semibold text-foreground font-mono tabular-nums">
            {option.walkingDistanceMeters}m
          </span>
          <span className="text-[10px]">Walking</span>
        </div>
        <div>
          <span className="block font-semibold text-foreground font-mono tabular-nums">
            {option.legs.some((l) => (l.waitingDurationMinutes ?? 0) > 0)
              ? `~${option.legs.reduce((acc, l) => acc + (l.waitingDurationMinutes || 0), 0)}m`
              : "0m"}
          </span>
          <span className="text-[10px]">Wait Time</span>
        </div>
      </div>

      {/* Chennai One Indicator */}
      <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1 text-accent font-medium">
          <Ticket className="h-3 w-3" />
          Chennai One Ready
        </span>
        <span className="text-[10px] text-muted-foreground/80 font-mono">
          {option.departureTime ? "Departs " + option.departureTime.slice(0, 5) : "Timetable unavailable"}
        </span>
      </div>
    </div>
  );
}
