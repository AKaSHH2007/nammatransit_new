import { useState } from "react";
import {
  Bus,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Compass,
  CreditCard,
  ExternalLink,
  Footprints,
  Info,
  MapPin,
  Sparkles,
  TrainFront,
} from "lucide-react";
import type { JourneyLeg, MultimodalJourneyOption } from "@/lib/transit/multimodal-types";
import { ChennaiOneBooking } from "./ChennaiOneBooking";

interface JourneyTimelineProps {
  option: MultimodalJourneyOption;
}

export function JourneyTimeline({ option }: JourneyTimelineProps) {
  const [expandedLegs, setExpandedLegs] = useState<Record<string, boolean>>({});

  const toggleLegExpansion = (legId: string) => {
    setExpandedLegs((prev) => ({
      ...prev,
      [legId]: !prev[legId],
    }));
  };

  const getModeTheme = (leg: JourneyLeg) => {
    switch (leg.mode) {
      case "metro":
        if (leg.color === "#EAB308" || leg.lineName.toLowerCase().includes("yellow")) {
          return {
            icon: <TrainFront className="h-4 w-4 text-amber-950" />,
            badgeBg: "bg-[#F59E0B] text-amber-950 font-bold",
            lineColor: "border-[#F59E0B]",
            nodeBg: "bg-[#F59E0B] text-amber-950 ring-4 ring-[#F59E0B]/20",
            tag: "Yellow Line (Phase 2 Corridor 4)",
            accentColor: "#F59E0B",
          };
        }
        if (leg.color === "#16A34A" || leg.lineName.toLowerCase().includes("green")) {
          return {
            icon: <TrainFront className="h-4 w-4 text-white" />,
            badgeBg: "bg-emerald-600 text-white font-semibold",
            lineColor: "border-emerald-500",
            nodeBg: "bg-emerald-500 text-white ring-4 ring-emerald-500/20",
            tag: "Green Line",
            accentColor: "#10B981",
          };
        }
        return {
          icon: <TrainFront className="h-4 w-4 text-white" />,
          badgeBg: "bg-[#3985FF] text-white font-semibold",
          lineColor: "border-[#3985FF]",
          nodeBg: "bg-[#3985FF] text-white ring-4 ring-[#3985FF]/20",
          tag: "Blue Line",
          accentColor: "#3985FF",
        };
      case "bus":
        return {
          icon: <Bus className="h-4 w-4 text-white" />,
          badgeBg: "bg-[#FFAA47] text-slate-950 font-semibold",
          lineColor: "border-[#FFAA47]",
          nodeBg: "bg-[#FFAA47] text-slate-950 ring-4 ring-[#FFAA47]/20",
          tag: "MTC Bus Service",
          accentColor: "#FFAA47",
        };
      case "train":
        return {
          icon: <TrainFront className="h-4 w-4 text-white" />,
          badgeBg: "bg-[#A78BFA] text-slate-950 font-semibold",
          lineColor: "border-[#A78BFA]",
          nodeBg: "bg-[#A78BFA] text-slate-950 ring-4 ring-[#A78BFA]/20",
          tag: "Southern Railway Suburban",
          accentColor: "#A78BFA",
        };
      case "walk":
        return {
          icon: <Footprints className="h-3.5 w-3.5 text-slate-300" />,
          badgeBg: "bg-slate-700 text-slate-300",
          lineColor: "border-slate-600 border-dashed",
          nodeBg: "bg-slate-700 text-slate-300 ring-2 ring-slate-600/40",
          tag: "Transfer Walk",
          accentColor: "#94A3B8",
        };
    }
  };

  return (
    <div className="rounded-2xl border border-border/80 bg-card p-5 shadow-soft transition-all">
      {/* Header Info */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3.5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-display text-base font-bold text-foreground">{option.title}</h3>
            {option.transferCount === 0 ? (
              <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                Direct
              </span>
            ) : (
              <span className="rounded-full bg-purple-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-purple-300">
                {option.transferCount} {option.transferCount === 1 ? "Transfer" : "Transfers"}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
            <span className="font-semibold text-foreground">~{option.durationMinutes} mins</span>
            <span>·</span>
            <span className="font-semibold text-accent font-mono">
              ₹{option.fare}
              {option.digitalFare && option.digitalFare < option.fare && (
                <span className="ml-1 text-[11px] font-normal text-muted-foreground">
                  (₹{option.digitalFare} digital)
                </span>
              )}
            </span>
            <span>·</span>
            <span>{option.totalStops} stops</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-muted/80 px-2.5 py-1 text-[11px] font-medium text-foreground/80 font-mono">
            Departure: {option.departureTime.slice(0, 5)}
          </span>
        </div>
      </div>

      {/* Vertical Step-by-Step Timeline with Explicit Boarding & Alighting */}
      <div className="relative space-y-7 pl-1">
        {option.legs.map((leg, legIdx) => {
          const theme = getModeTheme(leg);
          const isExpanded = Boolean(expandedLegs[leg.id]);
          const isWalk = leg.mode === "walk";
          const boardStop = leg.boardStation || leg.fromStation;
          const alightStop = leg.alightStation || leg.toStation;
          const serviceDir = leg.serviceDirection || leg.headsign;

          return (
            <div key={leg.id || legIdx} className="relative pl-9">
              {/* Vertical connecting line */}
              {legIdx < option.legs.length - 1 && (
                <div
                  className={`absolute left-4 top-8 bottom-0 w-0.5 -ml-px ${
                    isWalk
                      ? "border-l-2 border-dashed border-slate-600"
                      : "border-l-2 " + theme.lineColor
                  }`}
                />
              )}

              {/* Mode Icon Node */}
              <div
                className={`absolute left-0.5 top-0.5 grid h-7 w-7 place-items-center rounded-full shadow-md ${theme.nodeBg}`}
              >
                {theme.icon}
              </div>

              {/* Leg Main Card */}
              <div className="rounded-xl border border-border/60 bg-muted/20 p-4 transition hover:bg-muted/30">
                {/* Mode & Operator Header */}
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-sm font-bold text-foreground">
                      {leg.lineName}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[10px] uppercase tracking-wide ${theme.badgeBg}`}
                    >
                      {leg.operator}
                    </span>
                    {serviceDir && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-secondary/80 px-2 py-0.5 text-[11px] font-medium text-secondary-foreground border border-border/40">
                        <Compass className="h-3 w-3 text-accent" />
                        Towards: <strong className="font-semibold">{serviceDir}</strong>
                      </span>
                    )}
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-semibold text-foreground font-mono">
                      ~{leg.durationMinutes} mins
                    </span>
                    {leg.standardFare !== undefined && (
                      <div className="text-[11px] font-mono text-accent">
                        {leg.standardFare === 0 ? "Free transfer" : `₹${leg.standardFare}`}
                        {leg.digitalFare !== undefined && leg.digitalFare < leg.standardFare && (
                          <span className="ml-1 text-[10px] text-muted-foreground">
                            (₹{leg.digitalFare} digital)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* FEATURE 1: Explicit Boarding Station (Never Headsign) */}
                <div className="mt-3.5 rounded-lg border border-emerald-500/30 bg-emerald-950/20 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 shrink-0 font-mono text-[10px] font-bold">
                      A
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                        BOARDING STATION
                      </div>
                      <div className="font-display text-sm font-semibold text-foreground">
                        {boardStop}
                      </div>
                      {leg.departureTime && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Departs ~{leg.departureTime.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Intermediate Stops Sequence */}
                {!isWalk && leg.intermediateStops && leg.intermediateStops.length > 2 && (
                  <div className="my-2.5 ml-2 border-l-2 border-border/60 pl-3">
                    <button
                      type="button"
                      onClick={() => toggleLegExpansion(leg.id)}
                      className="inline-flex items-center gap-1.5 py-1 text-xs font-semibold text-accent hover:underline"
                    >
                      {isExpanded ? (
                        <>
                          <ChevronUp className="h-3.5 w-3.5" /> Hide{" "}
                          {leg.intermediateStops.length - 2} intermediate stops
                        </>
                      ) : (
                        <>
                          <ChevronDown className="h-3.5 w-3.5" /> View{" "}
                          {leg.intermediateStops.length - 2} intermediate stops
                        </>
                      )}
                    </button>

                    {isExpanded && (
                      <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        {leg.intermediateStops.slice(1, -1).map((stop, sIdx) => (
                          <li
                            key={stop.stopId || sIdx}
                            className="flex items-center justify-between py-0.5 hover:text-foreground transition-colors"
                          >
                            <span className="flex items-center gap-2">
                              <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" />
                              <span>{stop.name}</span>
                            </span>
                            {stop.arrival && (
                              <span className="font-mono text-[11px] text-muted-foreground/80">
                                {stop.arrival.slice(0, 5)}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}

                {/* FEATURE 1: Explicit Alighting Station */}
                <div className="mt-2.5 rounded-lg border border-rose-500/30 bg-rose-950/20 p-2.5">
                  <div className="flex items-start gap-2">
                    <span className="mt-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/20 text-rose-400 shrink-0 font-mono text-[10px] font-bold">
                      B
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
                        ALIGHTING STATION
                      </div>
                      <div className="font-display text-sm font-semibold text-foreground">
                        {alightStop}
                      </div>
                      {leg.arrivalTime && (
                        <div className="text-[11px] text-muted-foreground font-mono">
                          Arrives ~{leg.arrivalTime.slice(0, 5)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Walking Transfer Information */}
                {isWalk && (
                  <div className="mt-2.5 rounded-lg bg-secondary/50 p-2.5 text-xs text-muted-foreground space-y-1 border border-border/40">
                    <p className="flex items-center gap-1.5 font-medium text-foreground">
                      <Footprints className="h-3.5 w-3.5 text-accent" />
                      Interchange walk: <b>{leg.walkingDistanceMeters || 100} meters</b> (~
                      {leg.walkingDurationMinutes || 2} mins)
                    </p>
                    {leg.waitingDurationMinutes && leg.waitingDurationMinutes > 0 && (
                      <p className="flex items-center gap-1.5 text-amber-300">
                        <Clock className="h-3.5 w-3.5 text-amber-400" />
                        Expected platform wait: ~{leg.waitingDurationMinutes} mins
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* FEATURE 3: Official Accurate Fare Breakdown Card */}
      {option.fareBreakdown && option.fareBreakdown.length > 0 && (
        <div className="mt-6 rounded-xl border border-border/80 bg-secondary/30 p-4">
          <div className="flex items-center justify-between mb-3 border-b border-border/60 pb-2">
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-accent" />
              <span className="font-display text-xs font-bold uppercase tracking-wider text-foreground">
                Official Fare Breakdown
              </span>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Official CMRL / MTC / SR published rates
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {option.fareBreakdown.map((item, idx) => (
              <div key={idx} className="flex justify-between items-center text-muted-foreground">
                <div>
                  <span className="font-medium text-foreground">{item.label}</span>
                  {item.category && (
                    <span className="ml-2 text-[10px] text-muted-foreground/75">
                      ({item.category})
                    </span>
                  )}
                </div>
                <div className="text-right font-mono">
                  <span className="font-semibold text-foreground">₹{item.amount}</span>
                  {item.discount && (
                    <span className="ml-1.5 text-[10px] text-emerald-400">
                      (Digital ₹{item.amount - item.discount})
                    </span>
                  )}
                </div>
              </div>
            ))}

            <div className="border-t border-border/80 pt-2.5 flex justify-between items-center font-bold text-foreground">
              <div>
                <span className="text-sm">Total Standard Fare</span>
                {option.discountAmount && option.discountAmount > 0 ? (
                  <p className="text-[11px] font-normal text-emerald-400 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Digital / Smart Card discount: Save ₹{option.discountAmount} (Pay ₹
                    {option.digitalFare})
                  </p>
                ) : null}
              </div>
              <span className="font-display text-lg font-bold text-accent font-mono">
                ₹{option.fare}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* FEATURE 6: Integrated Chennai One Official Booking Section */}
      <div className="mt-6">
        <ChennaiOneBooking option={option} />
      </div>

      {/* Static Grounding & Timetable Disclaimer */}
      <div className="mt-5 flex items-start gap-2.5 rounded-xl border border-border/60 bg-muted/30 p-3.5 text-xs text-muted-foreground">
        <Info className="h-4 w-4 text-accent shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-foreground">
            {option.legs.some((l) => l.lineName?.toLowerCase().includes("yellow"))
              ? "Official CMRL Phase 2 Yellow Line Grounding"
              : "Official Chennai Transit Timetable Grounding"}
          </p>
          <p className="mt-1 leading-relaxed">
            {option.legs.some((l) => l.lineName?.toLowerCase().includes("yellow"))
              ? "Includes the operational Chennai Metro Phase 2 Corridor 4 (Poonamallee Bypass ↔ Vadapalani, commenced 11 October 2026). Timetable is grounded in CMRL frequency guidelines (10m peak, 15m off-peak); live vehicle GPS telemetry is not public."
              : "Schedules, routes and stations are grounded in verified Chennai transit GTFS datasets and official CMRL station-to-station fare matrices. Live GPS vehicle telemetry is not active."}
          </p>
        </div>
      </div>
    </div>
  );
}
