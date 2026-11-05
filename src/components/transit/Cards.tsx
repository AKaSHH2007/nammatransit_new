import { useState } from "react";
import {
  Accessibility,
  AlertTriangle,
  ArrowRight,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  Ticket,
  TrainFront,
} from "lucide-react";
import type { Card } from "@/lib/transit/engine";
import { OFFICIAL_LINKS } from "@/lib/transit/data";
import { MultimodalJourneyResults } from "./MultimodalJourneyResults";
import { ChennaiOneModal } from "./ChennaiOneBooking";

const Badge = ({
  children,
  tone = "warn",
}: {
  children: React.ReactNode;
  tone?: "warn" | "ok" | "danger" | "verified";
}) => (
  <span
    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide ${
      tone === "ok" || tone === "verified"
        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
        : tone === "danger"
          ? "bg-rose-500/15 text-rose-400 border border-rose-500/20"
          : "bg-amber-500/15 text-amber-300 border border-amber-500/20"
    }`}
  >
    {children}
  </span>
);

const Shell = ({
  icon: Icon,
  title,
  badge,
  children,
}: {
  icon: typeof Ticket;
  title: string;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) => (
  <div className="animate-rise rounded-2xl border border-border/80 bg-card p-4 shadow-soft">
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <Icon className="h-4 w-4 text-accent" />
      <h4 className="font-display text-sm font-bold text-foreground">{title}</h4>
      <span className="ml-auto">{badge}</span>
    </div>
    {children}
  </div>
);

export function ResultCard({
  card,
  onAskFollowUp,
}: {
  card: Card;
  onAskFollowUp?: (question: string) => void;
}) {
  const [showBookingModal, setShowBookingModal] = useState(false);

  if (card.kind === "journey") {
    const j = card.journey;
    return (
      <MultimodalJourneyResults
        origin={j.origin}
        destination={j.destination}
        travelDate={j.schedule?.serviceDate}
        initialOptions={j.multimodalOptions}
        onAskFollowUp={onAskFollowUp}
      />
    );
  }

  if (card.kind === "fare") {
    const isVerified = card.fare !== undefined && card.fare > 0;
    const digitalFare = isVerified ? Math.round(card.fare * 0.8) : null;

    return (
      <Shell
        icon={Ticket}
        title="Official Transport Fare"
        badge={
          isVerified ? (
            <Badge tone="verified">Official CMRL Published Fare</Badge>
          ) : (
            <Badge tone="warn">Fare unavailable</Badge>
          )
        }
      >
        <p className="text-sm font-semibold text-foreground">
          {card.journey.origin} → {card.journey.destination} · {card.journey.totalStops} stops
        </p>

        {isVerified ? (
          <div className="mt-3 rounded-xl border border-border/60 bg-secondary/40 p-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-3xl font-bold text-accent font-mono">
                ₹{card.fare}
              </span>
              <span className="text-xs text-muted-foreground">Standard Token / QR</span>
            </div>

            {digitalFare && digitalFare < card.fare && (
              <div className="mt-1 text-xs text-emerald-400 font-medium">
                ₹{digitalFare} with 20% Smart Card / Digital QR discount
              </div>
            )}

            <div className="mt-3 text-xs text-muted-foreground space-y-1">
              <p>• Source: CMRL official fare chart (last fare update: 22 February 2021)</p>
              <p>• This chart covers the stations listed in the published fare matrix; Yellow Line fares are not included</p>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setShowBookingModal(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-glow hover:bg-accent/90"
              >
                <Ticket className="h-3.5 w-3.5" />
                Book Ticket on Chennai One
              </button>
              <a
                href={OFFICIAL_LINKS.cmrlTickets}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-xl border border-border/80 bg-secondary/60 px-3 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
              >
                CMRL Portal <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-2 text-xs text-muted-foreground">
            <p className="font-semibold text-amber-300">Fare unavailable</p>
            <p className="mt-1">
              Could not verify official fare for this specific route segment against published
              matrices. Check at station ticket counters or on Chennai One.
            </p>
          </div>
        )}

        <ChennaiOneModal
          isOpen={showBookingModal}
          onClose={() => setShowBookingModal(false)}
          mode="metro"
          origin={card.journey.origin}
          destination={card.journey.destination}
          fare={card.fare}
          digitalFare={digitalFare ?? undefined}
        />
      </Shell>
    );
  }

  if (card.kind === "facility") {
    return (
      <Shell
        icon={Accessibility}
        title={`${card.station} — Facilities`}
        badge={<Badge tone="ok">Published Station Data</Badge>}
      >
        <ul className="grid gap-2 text-xs sm:grid-cols-2">
          {[
            "Lifts to concourse & platform",
            "Wheelchair-accessible entry ramps",
            "Tactile paving & braille signage",
            "Accessible ticket counter & gates",
          ].map((f) => (
            <li key={f} className="flex items-center gap-2 text-foreground">
              <Check className="h-4 w-4 text-accent shrink-0" />
              {f}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-muted-foreground">
          Source: CMRL published station accessibility facilities. Real-time lift maintenance status
          is not public.
        </p>
      </Shell>
    );
  }

  if (card.kind === "alerts") {
    return (
      <Shell
        icon={AlertTriangle}
        title="Service Updates & Bulletins"
        badge={<Badge tone="warn">Simulated Feed · Static GTFS</Badge>}
      >
        <div className="space-y-2">
          {card.alerts.map((a) => (
            <div
              key={a.id}
              className="rounded-xl border border-border/60 bg-secondary/40 p-3 text-xs"
            >
              <div className="flex flex-wrap items-center gap-2">
                <b className="text-foreground">{a.affected}</b>
                <Badge tone="warn">{a.type}</Badge>
              </div>
              <p className="mt-1 text-muted-foreground">{a.description}</p>
              <p className="mt-1.5 text-[10px] text-muted-foreground font-mono">
                Source: {a.source} · {new Date(a.updatedAt).toLocaleTimeString("en-IN")}
              </p>
            </div>
          ))}
        </div>
      </Shell>
    );
  }

  return <GrievanceCard card={card} />;
}

function GrievanceCard({ card }: { card: Extract<Card, { kind: "grievance" }> }) {
  const [d, setD] = useState(card.draft);
  const [copied, setCopied] = useState(false);
  const text = `Operator: ${d.operator}\nStation/Route: ${d.location}\nCategory: ${d.category}\nDate & time: ${d.datetime}\n\nDescription:\n${d.description}`;
  const fields: [keyof typeof d, string][] = [
    ["operator", "Operator"],
    ["location", "Station / route"],
    ["category", "Category"],
    ["datetime", "Date & time"],
  ];

  return (
    <Shell
      icon={AlertTriangle}
      title="Complaint Draft Assistant"
      badge={<Badge tone="danger">Draft Only — Not Submitted</Badge>}
    >
      <div className="grid gap-2.5 sm:grid-cols-2">
        {fields.map(([k, label]) => (
          <label key={k} className="text-xs font-semibold text-muted-foreground">
            {label}
            <input
              value={d[k]}
              onChange={(e) => setD({ ...d, [k]: e.target.value })}
              className="mt-1 w-full rounded-xl border border-border/80 bg-secondary/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
        ))}
      </div>
      <label className="mt-2.5 block text-xs font-semibold text-muted-foreground">
        Description
        <textarea
          value={d.description}
          onChange={(e) => setD({ ...d, description: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-xl border border-border/80 bg-secondary/50 px-3 py-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <div className="mt-3.5 flex flex-wrap gap-2">
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-xs font-bold text-accent-foreground shadow-glow hover:bg-accent/90"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied to Clipboard" : "Copy Complaint Text"}
        </button>
        <a
          href={card.link}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 rounded-xl border border-border/80 bg-secondary/60 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          Official Grievance Portal <ArrowRight className="h-4 w-4" />
        </a>
      </div>
    </Shell>
  );
}
