import { useEffect, useMemo, useState } from "react";
import {
  Award,
  Bus,
  Check,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  Compass,
  Footprints,
  Info,
  Layers,
  Map,
  MessageSquare,
  Repeat,
  Share2,
  Sparkles,
  Ticket,
  TrainFront,
  Zap,
  type LucideIcon,
} from "lucide-react";
import type {
  JourneySearchParams,
  MultimodalJourneyOption,
  RouteFilter,
} from "@/lib/transit/multimodal-types";
import { JourneySearchSummary } from "./JourneySearchSummary";
import { JourneyComparisonCard } from "./JourneyComparisonCard";
import { JourneyTimeline } from "./JourneyTimeline";
import { JourneyMap } from "./JourneyMap";
import { SmartJourneyAssistant } from "./SmartJourneyAssistant";

interface MultimodalJourneyResultsProps {
  origin: string;
  destination: string;
  travelDate?: string;
  departureTime?: string;
  initialOptions?: MultimodalJourneyOption[];
  onAskFollowUp?: (question: string) => void;
}

export function MultimodalJourneyResults({
  origin,
  destination,
  travelDate,
  departureTime,
  initialOptions,
  onAskFollowUp,
}: MultimodalJourneyResultsProps) {
  const [params, setParams] = useState<JourneySearchParams>({
    origin,
    destination,
    travelDate,
    departureTime: departureTime || "",
  });

  const [options, setOptions] = useState<MultimodalJourneyOption[]>(initialOptions || []);
  const [selectedOptionId, setSelectedOptionId] = useState<string>(initialOptions?.[0]?.id || "");
  const [activeFilter, setActiveFilter] = useState<RouteFilter>("all");
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeMobileView, setActiveMobileView] = useState<"timeline" | "map">("timeline");
  const [copiedShare, setCopiedShare] = useState(false);

  // Always replace options when the selected origin/destination changes.
  // An empty result must clear the previous route instead of showing stale cards.
  useEffect(() => {
    const nextOptions = initialOptions ?? [];
    setOptions(nextOptions);
    setSelectedOptionId(nextOptions[0]?.id || "");
    setActiveFilter("all");
  }, [initialOptions, origin, destination]);

  useEffect(() => {
    setParams((previous) => ({
      ...previous,
      origin,
      destination,
      travelDate,
      departureTime: departureTime || "",
    }));
  }, [origin, destination, travelDate, departureTime]);

  const handleSearch = (newParams: JourneySearchParams) => {
    setParams(newParams);
    if (onAskFollowUp) {
      const modeText =
        newParams.preferredMode && newParams.preferredMode !== "any"
          ? ` preferring ${newParams.preferredMode}`
          : "";
      onAskFollowUp(
        `How do I travel from ${newParams.origin} to ${newParams.destination}${
          newParams.travelDate ? ` on ${newParams.travelDate}` : ""
        }${newParams.departureTime ? ` departing at ${newParams.departureTime}` : ""}${modeText}?`,
      );
    }
  };

  // Filter and sort options based on activeFilter
  const filteredOptions = useMemo(() => {
    if (options.length === 0) return [];

    let list = [...options];

    switch (activeFilter) {
      case "fastest":
        list.sort((a, b) => a.durationMinutes - b.durationMinutes);
        break;
      case "cheapest":
        list.sort((a, b) => (a.fare > 0 ? a.fare : Number.POSITIVE_INFINITY) - (b.fare > 0 ? b.fare : Number.POSITIVE_INFINITY));
        break;
      case "fewest_transfers":
        list.sort((a, b) => a.transferCount - b.transferCount);
        break;
      case "least_walking":
        list.sort((a, b) => a.walkingDistanceMeters - b.walkingDistanceMeters);
        break;
      case "metro":
        list = list.filter((o) => o.modes.includes("metro"));
        break;
      case "yellow_line":
        list = list.filter((o) =>
          o.legs.some(
            (l) =>
              l.lineName?.toLowerCase().includes("yellow") ||
              l.routeNumber?.toLowerCase().includes("yellow"),
          ),
        );
        break;
      case "bus":
        list = list.filter((o) => o.modes.includes("bus"));
        break;
      case "train":
        list = list.filter((o) => o.modes.includes("train"));
        break;
      case "mixed":
        list = list.filter((o) => o.isMixedMode || o.modes.filter((m) => m !== "walk").length > 1);
        break;
      case "all":
      default:
        // Already ordered by composite best_overall score
        break;
    }

    return list;
  }, [options, activeFilter]);

  // Keep selectedOption in sync
  const selectedOption = useMemo(() => {
    if (filteredOptions.length === 0) {
      return options[0] || null;
    }
    const found = filteredOptions.find((o) => o.id === selectedOptionId);
    return found || filteredOptions[0]!;
  }, [filteredOptions, selectedOptionId, options]);

  const handleShare = async () => {
    if (!selectedOption) return;
    const fareText = selectedOption.fare > 0 ? "₹" + selectedOption.fare : "Fare unavailable";
    const scheduleText = selectedOption.departureTime
      ? "Departure: " + selectedOption.departureTime.slice(0, 5)
      : "Exact scheduled departures unavailable";
    const shareText = `🚇 NammaTransit AI Journey: ${params.origin} → ${params.destination}\n• Route: ${selectedOption.title}\n• Duration: ~${selectedOption.durationMinutes} mins (Fare: ${fareText})\n• ${scheduleText} (${selectedOption.totalStops} stops)\n(${selectedOption.scheduleSource})`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Journey from ${params.origin} to ${params.destination}`,
          text: shareText,
        });
        return;
      } catch {
        // Fall back to clipboard
      }
    }

    await navigator.clipboard.writeText(shareText);
    setCopiedShare(true);
    setTimeout(() => setCopiedShare(false), 2000);
  };

  // Filter button definitions
  const FILTERS: Array<{ id: RouteFilter; label: string; icon: LucideIcon; count?: number }> = [
    { id: "all", label: "All Routes", icon: Layers, count: options.length },
    {
      id: "fastest",
      label: "Fastest",
      icon: Zap,
      count: options.filter((o) => o.highlights.includes("fastest")).length || undefined,
    },
    {
      id: "cheapest",
      label: "Lowest Fare",
      icon: Coins,
      count: options.filter((o) => o.highlights.includes("cheapest")).length || undefined,
    },
    {
      id: "metro",
      label: "Metro",
      icon: TrainFront,
      count: options.filter((o) => o.modes.includes("metro")).length || undefined,
    },
    {
      id: "yellow_line",
      label: "Yellow Line",
      icon: TrainFront,
      count:
        options.filter((o) =>
          o.legs.some(
            (l) =>
              l.lineName?.toLowerCase().includes("yellow") ||
              l.routeNumber?.toLowerCase().includes("yellow"),
          ),
        ).length || undefined,
    },
    {
      id: "bus",
      label: "MTC Bus",
      icon: Bus,
      count: options.filter((o) => o.modes.includes("bus")).length || undefined,
    },
    {
      id: "train",
      label: "Suburban Rail",
      icon: TrainFront,
      count: options.filter((o) => o.modes.includes("train")).length || undefined,
    },
    {
      id: "mixed",
      label: "Multimodal",
      icon: Repeat,
      count:
        options.filter((o) => o.isMixedMode || o.modes.filter((m) => m !== "walk").length > 1)
          .length || undefined,
    },
    {
      id: "fewest_transfers",
      label: "Direct Route",
      icon: Sparkles,
      count: options.filter((o) => o.transferCount === 0).length || undefined,
    },
    {
      id: "least_walking",
      label: "Least Walking",
      icon: Footprints,
      count: options.filter((o) => o.highlights.includes("least_walking")).length || undefined,
    },
  ];

  if (options.length === 0) {
    const isSameOriginDest =
      params.origin.trim().toLowerCase() === params.destination.trim().toLowerCase();

    return (
      <div className="space-y-4">
        <JourneySearchSummary
          params={params}
          totalAlternatives={0}
          onUpdateSearch={handleSearch}
          isLoading={isLoading}
        />
        <div className="rounded-2xl border border-border/80 bg-card p-6 text-center shadow-soft">
          <p className="text-sm font-semibold text-foreground">
            {isSameOriginDest
              ? `Origin and destination cannot be the same station (${params.origin}).`
              : `No direct or multimodal route found for ${params.origin} → ${params.destination}.`}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground max-w-md mx-auto">
            {isSameOriginDest
              ? "Please select different start and end locations."
              : "Try searching between major Chennai transit hubs such as Guindy, Chennai Central, Airport, Koyambedu, or Tambaram."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 text-left">
      {/* 1. Journey Search Summary Header */}
      <JourneySearchSummary
        params={params}
        totalAlternatives={options.length}
        onUpdateSearch={handleSearch}
        isLoading={isLoading}
      />

      {/* Main Container */}
      <div className="rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
        {/* Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Compass className="h-4 w-4" />
            </span>
            <div>
              <h3 className="font-display text-sm font-bold text-foreground">
                Route Alternatives ({filteredOptions.length})
              </h3>
              <p className="text-[11px] text-muted-foreground">
                Ranked by shortest travel time, lowest fare, and minimal transfers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary hover:text-accent"
            >
              {copiedShare ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" /> Copied
                </>
              ) : (
                <>
                  <Share2 className="h-3.5 w-3.5 text-accent" /> Share
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-secondary/60 px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="h-3.5 w-3.5" /> Collapse
                </>
              ) : (
                <>
                  <ChevronDown className="h-3.5 w-3.5" /> Details
                </>
              )}
            </button>
          </div>
        </div>

        {/* 2. Interactive Route Filters Bar */}
        <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1.5 scrollbar-thin">
          {FILTERS.map((f) => {
            const Icon = f.icon;
            const isActive = activeFilter === f.id;
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => setActiveFilter(f.id)}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-xl px-3 py-1.5 text-xs font-medium transition shrink-0 ${
                  isActive
                    ? "bg-accent text-accent-foreground font-semibold shadow-glow"
                    : "border border-border/60 bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {f.label}
                {f.count !== undefined && (
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono tabular-nums ${
                      isActive
                        ? "bg-slate-950/20 text-slate-950 font-bold"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {f.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. Detailed Journey Cards Grid */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filteredOptions.map((option) => (
            <JourneyComparisonCard
              key={option.id}
              option={option}
              isSelected={option.id === selectedOption?.id}
              onSelect={() => setSelectedOptionId(option.id)}
            />
          ))}
        </div>

        {/* 4. Expandable Detailed View: Timeline & Interactive Leaflet Map */}
        {isExpanded && selectedOption && (
          <div className="mt-6 space-y-5 border-t border-border/60 pt-5">
            {/* Contextual Action Bar for Selected Journey */}
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-secondary/40 border border-border/50 p-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
                <span className="font-semibold text-foreground">
                  Active Selection: {selectedOption.title}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-muted-foreground">Quick queries:</span>
                <button
                  type="button"
                  onClick={() =>
                    onAskFollowUp?.(`What is the fare breakdown for ${selectedOption.title}?`)
                  }
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition"
                >
                  Fare details
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAskFollowUp?.(`Where do I transfer for ${selectedOption.title}?`)
                  }
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-muted transition"
                >
                  Transfer points
                </button>
                <button
                  type="button"
                  onClick={() =>
                    onAskFollowUp?.(
                      `How do I book ticket for ${selectedOption.title} on Chennai One?`,
                    )
                  }
                  className="rounded-lg border border-border bg-card px-2.5 py-1 text-[11px] font-medium text-accent hover:bg-muted transition flex items-center gap-1"
                >
                  <Ticket className="h-3 w-3" />
                  Chennai One
                </button>
              </div>
            </div>

            {/* Mobile View Switcher (Timeline vs Map) */}
            <div className="flex rounded-xl bg-secondary p-1 sm:hidden border border-border/60">
              <button
                type="button"
                onClick={() => setActiveMobileView("timeline")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  activeMobileView === "timeline"
                    ? "bg-accent text-accent-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Journey Timeline
              </button>
              <button
                type="button"
                onClick={() => setActiveMobileView("map")}
                className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition ${
                  activeMobileView === "map"
                    ? "bg-accent text-accent-foreground shadow-2xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Interactive Map
              </button>
            </div>

            {/* Split / Responsive Layout: Timeline on Left, Map on Right */}
            <div className="grid gap-5 lg:grid-cols-12">
              <div
                className={`space-y-4 lg:col-span-7 ${
                  activeMobileView === "timeline" ? "block" : "hidden sm:block"
                }`}
              >
                <JourneyTimeline option={selectedOption} />
              </div>

              <div
                className={`space-y-4 lg:col-span-5 ${
                  activeMobileView === "map" ? "block" : "hidden sm:block"
                }`}
              >
                <JourneyMap
                  option={selectedOption}
                  alternatives={filteredOptions}
                  onSelectAlternative={setSelectedOptionId}
                />
              </div>
            </div>

            {/* 5. Smart Journey Assistant Contextual Prompts */}
            <SmartJourneyAssistant
              options={options}
              activeOptionId={selectedOption.id}
              onAskChatQuestion={onAskFollowUp}
            />
          </div>
        )}
      </div>
    </div>
  );
}
