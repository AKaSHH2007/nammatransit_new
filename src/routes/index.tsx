import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Accessibility,
  ArrowRight,
  BellRing,
  CheckCircle2,
  Compass,
  Map,
  MessageSquareWarning,
  Navigation,
  Sparkles,
  Ticket,
  TrainFront,
  Zap,
} from "lucide-react";
import { Brand, Disclaimer } from "@/components/transit/Brand";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "NammaTransit AI — Chennai Public Transit Mobility & Chennai One" },
      {
        name: "description",
        content:
          "Plan journeys across Chennai Metro, MTC Buses and Suburban Rail with official CMRL fare tables, typo-corrected location search, interactive route maps and Chennai One booking.",
      },
      {
        property: "og:title",
        content: "NammaTransit AI — Chennai Public Transit Mobility & Chennai One",
      },
      {
        property: "og:description",
        content:
          "Official CMRL station-to-station fares, Phase 2 Yellow Line, multimodal routes, and Chennai One ticketing guidance.",
      },
    ],
  }),
  component: Index,
});

const features = [
  {
    icon: Map,
    title: "Multimodal Routing",
    text: "Chennai Metro (Blue, Green, Yellow Line), MTC Buses, and Suburban EMU trains with explicit boarding & alighting stops.",
  },
  {
    icon: Ticket,
    title: "Official CMRL Fares",
    text: "Exact station-to-station fares based on official CMRL fare tables with 20% smart card/digital QR discounts.",
  },
  {
    icon: Sparkles,
    title: "Intelligent Typo Search",
    text: "Handles Tamil phonetics, misspellings, and colloquial station names (e.g. Koyeembedu → Koyambedu, Gindi → Guindy).",
  },
  {
    icon: Navigation,
    title: "Interactive Live-Style Map",
    text: "CartoDB Dark Matter Leaflet map, glowing route polylines, transfer markers, and current user geolocation.",
  },
  {
    icon: CheckCircle2,
    title: "Chennai One Ticketing",
    text: "Official CUMTA Chennai One integration with mode-specific booking actions and step-by-step guidance.",
  },
];

function Index() {
  return (
    <div className="min-h-screen bg-background text-foreground transition-colors">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-[#101D30] to-[#07111F] text-foreground border-b border-border/60">
        <div className="mx-auto max-w-6xl px-6 pb-24 pt-6">
          <nav className="flex items-center justify-between">
            <Brand light />
            <Link
              to="/chat"
              className="rounded-full border border-border/80 bg-secondary/80 px-4 py-2 text-xs font-semibold text-foreground hover:bg-secondary transition hover:border-accent"
            >
              Open Mobility Assistant
            </Link>
          </nav>

          <div className="mt-16 grid items-center gap-12 lg:grid-cols-2">
            <div className="animate-rise">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/15 px-3 py-1 text-xs font-bold uppercase tracking-wider text-accent border border-accent/20">
                <Sparkles className="h-3.5 w-3.5" />
                Chennai Metro · MTC · Suburban · Chennai One
              </span>

              <h1 className="mt-5 font-display text-4xl font-bold leading-tight tracking-tight sm:text-5xl md:text-6xl text-foreground">
                Your Chennai Journey, <span className="text-accent">Simplified</span>.
              </h1>

              <p className="mt-5 max-w-lg text-base text-muted-foreground leading-relaxed">
                Real GTFS route planner, official CMRL station-to-station fare matrices, Phase 2
                Yellow Line corridor, intelligent Tamil phonetic typo correction, and direct
                ticketing guidance on official Chennai One.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link
                  to="/chat"
                  className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-glow transition hover:opacity-95"
                >
                  Start Planning <ArrowRight className="h-4 w-4" />
                </Link>

                <a
                  href="https://www.chennaione.in/"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-card px-5 py-3 text-xs font-semibold text-foreground hover:bg-secondary transition"
                >
                  Official Chennai One <Ticket className="h-3.5 w-3.5 text-accent" />
                </a>
              </div>
            </div>

            {/* Live Interactive Preview Card */}
            <div
              className="animate-rise rounded-3xl border border-border/80 bg-[#17263B] p-6 shadow-2xl backdrop-blur"
              style={{ animationDelay: "120ms" }}
            >
              <div className="flex items-center justify-between border-b border-border/60 pb-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full bg-rose-500 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-amber-500 inline-block" />
                  <span className="h-3 w-3 rounded-full bg-emerald-500 inline-block" />
                  <span className="ml-2 font-mono text-xs text-muted-foreground">
                    assistant preview
                  </span>
                </div>
                <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-mono text-accent">
                  Official Fares Grounded
                </span>
              </div>

              <div className="mt-4 space-y-3.5 text-xs">
                {/* User query */}
                <div className="ml-auto w-fit rounded-2xl rounded-br-xs bg-primary px-4 py-2 text-primary-foreground font-medium shadow-xs">
                  Koyeembedu to Chennai Airport
                </div>

                {/* Assistant response */}
                <div className="rounded-2xl rounded-bl-xs border border-border/60 bg-secondary/70 p-3.5 text-foreground space-y-2">
                  <div className="flex items-center gap-1.5 text-[11px] text-accent font-semibold">
                    <Sparkles className="h-3.5 w-3.5" />
                    Resolved "Koyeembedu" → <strong>Koyambedu</strong>
                  </div>

                  <div className="border-t border-border/50 pt-2 text-muted-foreground space-y-1">
                    <div className="flex justify-between items-center text-foreground font-semibold">
                      <span>Koyambedu → Chennai Airport</span>
                      <span className="text-accent font-mono font-bold">₹40 (₹32 digital)</span>
                    </div>
                    <p className="text-[11px]">
                      Board <strong>Green Line</strong> towards <strong>St. Thomas Mount</strong> at
                      Koyambedu. Transfer at Alandur to <strong>Blue Line</strong> towards Airport.
                    </p>
                  </div>

                  <div className="mt-2 flex items-center justify-between pt-1">
                    <span className="text-[10px] text-muted-foreground font-mono">
                      CMRL Official Table · 33 min
                    </span>
                    <span className="rounded-md bg-accent/20 px-2 py-0.5 text-[10px] font-bold text-accent">
                      Book on Chennai One
                    </span>
                  </div>
                </div>

                {/* User query 2 */}
                <div className="ml-auto w-fit rounded-2xl rounded-br-xs bg-primary px-4 py-2 text-primary-foreground font-medium shadow-xs">
                  Guindy to Chennai Airport fare?
                </div>

                {/* Assistant response 2 */}
                <div className="w-fit max-w-[90%] rounded-2xl rounded-bl-xs bg-secondary/70 border border-border/60 px-4 py-2 text-foreground">
                  Official CMRL fare: <strong>₹30</strong> token / QR (<strong>₹24</strong> with 20%
                  smart card discount) — 4 stops on Blue Line towards Airport.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Cards Grid */}
      <section className="mx-auto -mt-8 grid max-w-6xl gap-4 px-6 sm:grid-cols-2 lg:grid-cols-5 relative z-10">
        {features.map((f) => (
          <div
            key={f.title}
            className="rounded-2xl border border-border/80 bg-[#17263B] p-5 shadow-soft transition hover:border-accent/50 hover:translate-y-[-2px]"
          >
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/15 text-accent border border-accent/20">
              <f.icon className="h-5 w-5" />
            </div>
            <h3 className="mt-3.5 font-display text-sm font-bold text-foreground">{f.title}</h3>
            <p className="mt-1.5 text-xs text-muted-foreground leading-relaxed">{f.text}</p>
          </div>
        ))}
      </section>

      {/* Official Sources & Disclaimers Footer */}
      <footer className="mx-auto max-w-6xl px-6 py-14">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6">
          <div className="grid gap-6 md:grid-cols-3 text-xs text-muted-foreground">
            <div>
              <h4 className="font-semibold text-foreground mb-1">Official Transport Grounding</h4>
              <p>
                Schedules and station networks are grounded in official Chennai GTFS datasets and
                the newly operational CMRL Phase 2 Yellow Line Corridor 4.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">CMRL & MTC Published Fares</h4>
              <p>
                Fare matrices reflect official CMRL station-to-station tables (chennaimetrorail.org)
                and MTC fare stages. "Fare unavailable" is displayed if unverified.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-1">CUMTA Chennai One Integration</h4>
              <p>
                Integrated with official Chennai One (chennaione.in / in.mobility.cumta). No tickets
                are sold or payments processed directly in this app.
              </p>
            </div>
          </div>

          <div className="mt-6 border-t border-border/50 pt-4">
            <Disclaimer />
          </div>
        </div>
      </footer>
    </div>
  );
}
