import { useState } from "react";
import {
  ExternalLink,
  Smartphone,
  Ticket,
  TrainFront,
  Bus,
  CheckCircle,
  Info,
  ShieldCheck,
  ChevronRight,
  QrCode,
  Sparkles,
} from "lucide-react";
import type {
  MultimodalJourneyOption,
  TransportMode,
  JourneyLeg,
} from "@/lib/transit/multimodal-types";

interface ChennaiOneBookingProps {
  option: MultimodalJourneyOption;
  compact?: boolean;
}

export const CHENNAI_ONE_URLS = {
  web: "https://www.chennaione.in/",
  playStore: "https://play.google.com/store/apps/details?id=in.mobility.cumta",
  cmrlApp: "https://chennaimetrorail.org/mobile-app/",
  utsApp: "https://play.google.com/store/apps/details?id=com.cris.utsmobile",
};

export function getChennaiOneBookingInfo(
  mode: TransportMode,
  origin: string,
  destination: string,
  fare?: number,
) {
  const actionLabel =
    mode === "metro"
      ? "Book Metro Ticket on Chennai One"
      : mode === "bus"
        ? "Book Bus Ticket on Chennai One"
        : mode === "train"
          ? "Book Train Ticket on Chennai One"
          : "Book Ticket on Chennai One";

  return {
    actionLabel,
    portalUrl: CHENNAI_ONE_URLS.web,
    playStoreUrl: CHENNAI_ONE_URLS.playStore,
    origin,
    destination,
    fare,
    steps: [
      "Download or open the Chennai One app by CUMTA (or visit chennaione.in).",
      `Select ${mode === "metro" ? "Metro" : mode === "bus" ? "Bus" : "Suburban Train"} ticketing option.`,
      `Set starting station as ${origin} and destination as ${destination}.`,
      "Choose an available ticket type, verify its current price and any discount, then complete payment in the official app.",
      "Show generated QR code at AFC gates or bus conductor scanner.",
    ],
  };
}

export function ChennaiOneBooking({ option, compact = false }: ChennaiOneBookingProps) {
  const [showModal, setShowModal] = useState(false);
  const [selectedLegToBook, setSelectedLegToBook] = useState<JourneyLeg | null>(null);

  // Identify ticketable modes present in this journey
  const transitLegs = option.legs.filter((l) => l.mode !== "walk");
  const hasMetro = option.modes.includes("metro");
  const hasBus = option.modes.includes("bus");
  const hasTrain = option.modes.includes("train");

  const originStation = option.originStation || option.legs[0]?.fromStation || "Origin";
  const destinationStation =
    option.destinationStation || option.legs[option.legs.length - 1]?.toStation || "Destination";

  const getBookingActionText = () => {
    if (hasMetro && !hasBus && !hasTrain) {
      return "Book Metro Ticket on Chennai One";
    }
    if (hasBus && !hasMetro && !hasTrain) {
      return "Book Bus Ticket on Chennai One";
    }
    if (hasTrain && !hasMetro && !hasBus) {
      return "Book Train Ticket on Chennai One";
    }
    return "Book Journey on Chennai One";
  };

  const getModeIcon = (mode: TransportMode) => {
    switch (mode) {
      case "metro":
        return <TrainFront className="h-4 w-4 text-[#3985FF]" />;
      case "bus":
        return <Bus className="h-4 w-4 text-[#FFAA47]" />;
      case "train":
        return <TrainFront className="h-4 w-4 text-[#A78BFA]" />;
      default:
        return <Ticket className="h-4 w-4 text-emerald-400" />;
    }
  };

  const openChennaiOneWeb = (_leg?: JourneyLeg | null) => {
    // No documented route-prefill deep link is configured. Navigate directly
    // to the official portal so popup blockers cannot leave a blank tab.
    window.location.assign(CHENNAI_ONE_URLS.web);
  };

  const openPlayStore = () => {
    window.location.assign(CHENNAI_ONE_URLS.playStore);
  };

  if (compact) {
    return (
      <div className="flex items-center justify-between gap-2 border-t border-[#1E293B] pt-2.5">
        <div className="flex items-center gap-1.5 text-xs text-[#94A3B8]">
          <Ticket className="h-3.5 w-3.5 text-[#00D6A3]" />
          <span>Chennai One:</span>
          <span className="font-semibold text-white font-mono">
            {option.digitalFare && option.digitalFare > 0 ? "₹" + option.digitalFare : "Fare unavailable"}
          </span>
          {option.discountAmount && option.discountAmount > 0 ? (
            <span className="rounded bg-[#00D6A3]/20 px-1 py-0.2 text-[10px] font-bold text-[#00D6A3]">
              Save ₹{option.discountAmount}
            </span>
          ) : null}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowModal(true);
          }}
          className="inline-flex items-center gap-1 rounded-lg bg-[#00D6A3] px-2.5 py-1 text-[11px] font-semibold text-[#07111F] transition hover:bg-[#00D6A3]/90 shadow-sm"
        >
          <Smartphone className="h-3 w-3" />
          <span>Book on Chennai One</span>
        </button>

        {showModal && (
          <BookingGuideModal
            option={option}
            originStation={originStation}
            destinationStation={destinationStation}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1E293B] bg-[#101D30] p-4.5 shadow-soft">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1E293B] pb-3">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#00D6A3]/15 text-[#00D6A3] border border-[#00D6A3]/30">
            <Ticket className="h-4 w-4" />
          </span>
          <div>
            <h4 className="font-display text-sm font-semibold text-white flex items-center gap-1.5">
              Chennai One Integrated Ticketing
              <span className="rounded-full bg-[#00D6A3]/20 px-2 py-0.2 text-[10px] font-bold text-[#00D6A3]">
                Official CUMTA
              </span>
            </h4>
            <p className="text-xs text-[#94A3B8]">
              Single mobility app for Metro, MTC Bus & Suburban Railway in Chennai
            </p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-xs text-[#94A3B8]">Digital Fare</div>
          <div className="font-display text-lg font-bold text-[#00D6A3] font-mono tabular-nums">
            {option.digitalFare && option.digitalFare > 0
              ? "₹" + option.digitalFare
              : option.fare > 0
                ? "₹" + option.fare
                : "Fare unavailable"}
          </div>
        </div>
      </div>

      {/* Discount Highlight Banner */}
      {hasMetro && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-[#00D6A3]/10 border border-[#00D6A3]/25 px-3 py-2 text-xs text-[#00D6A3]">
          <Sparkles className="h-4 w-4 shrink-0" />
          <span>
            Check the current QR-ticket or Smart Card discount displayed in Chennai One before payment. The discount depends on the applicable ticket rules.
          </span>
        </div>
      )}

      {/* Leg-by-Leg Booking Options for Multimodal */}
      <div className="mt-3.5 space-y-2">
        <div className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
          Eligible Ticketable Legs
        </div>

        {transitLegs.map((leg, idx) => (
          <div
            key={leg.id || idx}
            className="flex items-center justify-between gap-3 rounded-xl border border-[#1E293B] bg-[#17263B] p-3 text-xs transition hover:border-[#00D6A3]/50"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#101D30] border border-[#1E293B]">
                {getModeIcon(leg.mode)}
              </span>
              <div className="min-w-0">
                <div className="font-semibold text-white truncate">
                  {leg.fromStation} → {leg.toStation}
                </div>
                <div className="text-[11px] text-[#94A3B8] flex items-center gap-1.5">
                  <span>{leg.lineName}</span>
                  <span>·</span>
                  <span className="font-mono text-white">
                    {leg.digitalFare && leg.digitalFare > 0
                      ? "₹" + leg.digitalFare
                      : leg.standardFare && leg.standardFare > 0
                        ? "₹" + leg.standardFare
                        : leg.fareRupees && leg.fareRupees > 0
                          ? "₹" + leg.fareRupees
                          : "Fare unavailable"}
                  </span>
                  {leg.digitalFare && leg.standardFare && leg.digitalFare < leg.standardFare && (
                    <span className="text-[#00D6A3] font-medium">(digital discount)</span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedLegToBook(leg);
                setShowModal(true);
              }}
              className="inline-flex items-center gap-1 rounded-lg bg-[#101D30] border border-[#1E293B] px-3 py-1.5 text-[11px] font-semibold text-[#00D6A3] hover:bg-[#00D6A3] hover:text-[#07111F] transition shrink-0"
            >
              <span>
                Book {leg.mode === "metro" ? "Metro" : leg.mode === "bus" ? "Bus" : "Train"}
              </span>
              <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        ))}
      </div>

      {/* Main Action Bar */}
      <div className="mt-4 flex flex-wrap items-center gap-2.5">
        <button
          type="button"
          onClick={() => {
            setSelectedLegToBook(null);
            setShowModal(true);
          }}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D6A3] px-4 py-2.5 text-xs font-bold text-[#07111F] transition hover:bg-[#00D6A3]/90 shadow-glow"
        >
          <Smartphone className="h-4 w-4" />
          <span>{getBookingActionText()}</span>
        </button>

        <a
          href={CHENNAI_ONE_URLS.web}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#1E293B] bg-[#17263B] px-3.5 py-2.5 text-xs font-semibold text-white transition hover:bg-[#101D30]"
        >
          <span>Official Portal</span>
          <ExternalLink className="h-3.5 w-3.5 text-[#94A3B8]" />
        </a>
      </div>

      {/* Transparent Disclaimer */}
      <div className="mt-3 flex items-start gap-1.5 text-[11px] text-[#64748B]">
        <ShieldCheck className="h-3.5 w-3.5 shrink-0 mt-0.5 text-[#00D6A3]" />
        <span>
          NammaTransit AI directs passengers to the official Chennai One government application
          (CUMTA). No ticket fees or payment credentials are collected on this platform.
        </span>
      </div>

      {/* Step-by-Step Booking Guide Modal */}
      {showModal && (
        <BookingGuideModal
          option={option}
          leg={selectedLegToBook}
          originStation={selectedLegToBook?.fromStation || originStation}
          destinationStation={selectedLegToBook?.toStation || destinationStation}
          onClose={() => {
            setShowModal(false);
            setSelectedLegToBook(null);
          }}
        />
      )}
    </div>
  );
}

export interface ChennaiOneModalProps {
  isOpen: boolean;
  onClose: () => void;
  mode?: TransportMode;
  origin?: string;
  destination?: string;
  fare?: number;
  digitalFare?: number;
}

export function ChennaiOneModal({
  isOpen,
  onClose,
  mode = "metro",
  origin = "Origin",
  destination = "Destination",
  fare,
  digitalFare,
}: ChennaiOneModalProps) {
  if (!isOpen) return null;
  const bookingInfo = getChennaiOneBookingInfo(mode, origin, destination, fare);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-rise">
      <div className="relative w-full max-w-md rounded-2xl border border-border/80 bg-[#17263B] p-5 shadow-2xl text-foreground">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Ticket className="h-5 w-5 text-accent" />
            <h4 className="font-display text-sm font-bold text-foreground">
              {bookingInfo.actionLabel}
            </h4>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-4 space-y-3 text-xs text-muted-foreground">
          <div className="rounded-xl border border-border/60 bg-[#101D30] p-3">
            <div className="flex items-center justify-between text-foreground font-semibold">
              <span>
                {origin} → {destination}
              </span>
              {fare && <span className="font-mono text-accent">₹{fare}</span>}
            </div>
            {digitalFare && (
              <p className="mt-1 text-[11px] text-emerald-400">
                ₹{digitalFare} (20% digital ticket discount on Chennai One)
              </p>
            )}
          </div>

          <div className="space-y-1.5 pt-1">
            <p className="font-semibold text-foreground text-[11px] uppercase tracking-wider">
              Step-by-Step Ticketing Instructions:
            </p>
            <ol className="list-decimal pl-4 space-y-1 text-foreground/80">
              {bookingInfo.steps.map((s, idx) => (
                <li key={idx}>{s}</li>
              ))}
            </ol>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 pt-2">
            <a
              href={bookingInfo.portalUrl}
              target="_blank"
              rel="noreferrer"
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs font-bold text-accent-foreground shadow-glow hover:bg-accent/90"
            >
              Open Chennai One Web <ExternalLink className="h-3.5 w-3.5" />
            </a>
            <a
              href={bookingInfo.playStoreUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border/80 bg-secondary px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-secondary/80"
            >
              Get App <Smartphone className="h-3.5 w-3.5" />
            </a>
          </div>

          <p className="text-[10px] text-muted-foreground/75 text-center pt-1">
            Official CUMTA ticketing service. No payment processed in this app.
          </p>
        </div>
      </div>
    </div>
  );
}

interface BookingGuideModalProps {
  option: MultimodalJourneyOption;
  leg?: JourneyLeg | null;
  originStation: string;
  destinationStation: string;
  onClose: () => void;
}

function BookingGuideModal({
  option,
  leg,
  originStation,
  destinationStation,
  onClose,
}: BookingGuideModalProps) {
  const fare = leg
    ? (leg.digitalFare ?? leg.standardFare ?? leg.fareRupees ?? undefined)
    : (option.digitalFare ?? (option.fare > 0 ? option.fare : undefined));

  const openApp = () => {
    // Use the official portal until a documented app deep link is available.
    window.location.assign(CHENNAI_ONE_URLS.web);
  };

  const openStore = () => {
    window.location.assign(CHENNAI_ONE_URLS.playStore);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-rise"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#1E293B] bg-[#101D30] p-5 shadow-2xl text-left">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#00D6A3]/20 text-[#00D6A3] border border-[#00D6A3]/40">
              <QrCode className="h-5 w-5" />
            </span>
            <div>
              <h3 className="font-display text-base font-bold text-white">Book on Chennai One</h3>
              <p className="text-xs text-[#94A3B8]">Official CUMTA Mobility Companion</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-[#94A3B8] hover:bg-[#17263B] hover:text-white"
          >
            ✕
          </button>
        </div>

        {/* Selected Route Info Box */}
        <div className="mt-4 rounded-xl border border-[#1E293B] bg-[#17263B] p-3.5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#94A3B8]">
            <span>Selected Journey</span>
            <span className="font-mono text-[#00D6A3] font-bold">{fare && fare > 0 ? "Fare shown: ₹" + fare : "Fare unavailable"}</span>
          </div>

          <div className="flex items-center gap-2 text-sm font-semibold text-white">
            <span>{originStation}</span>
            <span className="text-[#00D6A3]">→</span>
            <span>{destinationStation}</span>
          </div>

          {leg && (
            <div className="text-xs text-[#94A3B8] flex items-center gap-1.5">
              <span>Operator: {leg.operator}</span>
              <span>·</span>
              <span>{leg.lineName}</span>
            </div>
          )}
        </div>

        {/* 3 Simple Booking Steps */}
        <div className="mt-4 space-y-3">
          <h4 className="text-xs font-bold text-[#F8FAFC] uppercase tracking-wider">
            Booking Instructions
          </h4>

          <div className="flex items-start gap-2.5 text-xs text-[#94A3B8]">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1E293B] text-[11px] font-bold text-[#00D6A3] shrink-0">
              1
            </span>
            <p>
              Open <b>Chennai One</b> app or visit <b>chennaione.in</b> on your mobile device.
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-[#94A3B8]">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1E293B] text-[11px] font-bold text-[#00D6A3] shrink-0">
              2
            </span>
            <p>
              Select origin <b>"{originStation}"</b> and destination <b>"{destinationStation}"</b>.
            </p>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-[#94A3B8]">
            <span className="grid h-5 w-5 place-items-center rounded-full bg-[#1E293B] text-[11px] font-bold text-[#00D6A3] shrink-0">
              3
            </span>
            <p>
              Review the ticket type, displayed price, and any eligible discount in Chennai One.
              Complete payment only in the official app or portal.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <button
            type="button"
            onClick={openApp}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#00D6A3] px-4 py-2.5 text-xs font-bold text-[#07111F] hover:bg-[#00D6A3]/90 transition shadow-glow"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open Chennai One Portal</span>
          </button>

          <button
            type="button"
            onClick={openStore}
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-[#1E293B] bg-[#17263B] px-4 py-2 text-xs font-semibold text-white hover:bg-[#101D30] transition"
          >
            <Smartphone className="h-4 w-4 text-[#00D6A3]" />
            <span>Install Chennai One App (Google Play)</span>
          </button>
        </div>

        {/* Disclaimer */}
        <p className="mt-3 text-center text-[10px] text-[#64748B]">
          No payment is taken on this prototype. Official ticketing is managed by CUMTA & CMRL.
        </p>
      </div>
    </div>
  );
}
