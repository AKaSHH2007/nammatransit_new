import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Accessibility,
  ArrowRight,
  BellRing,
  Check,
  Compass,
  CreditCard,
  Loader2,
  Map,
  Moon,
  Menu,
  MessageSquareWarning,
  Plus,
  SendHorizontal,
  Sun,
  Ticket,
  TrainFront,
  TramFront,
  X,
} from "lucide-react";
import { Brand, Disclaimer } from "@/components/transit/Brand";
import { ResultCard } from "@/components/transit/Cards";
import { sendChat } from "@/lib/transit/chat.functions";
import type { Card, Context } from "@/lib/transit/engine";

export const Route = createFileRoute("/chat")({
  head: () => ({
    meta: [
      { title: "Chat — NammaTransit AI" },
      {
        name: "description",
        content:
          "Chat with NammaTransit AI about Chennai public transport, Metro, MTC buses, Suburban rail, and Chennai One tickets.",
      },
      { property: "og:title", content: "Chat — NammaTransit AI" },
      {
        property: "og:description",
        content:
          "Multi-turn assistant for Chennai public transport with official fares and Chennai One booking integration.",
      },
    ],
  }),
  component: ChatPage,
});

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  cards?: Card[];
  error?: boolean;
};

type Saved = {
  id: string;
  title: string;
  updatedAt: number;
  messages: Msg[];
  context: Context;
  suggestions: string[];
};

type ConversationStore = {
  activeId: string;
  conversations: Saved[];
};

const STORE_KEY = "nammatransit-conversations-v2";
const LEGACY_KEY = "nammatransit-conversation";

const WELCOME: Msg = {
  id: "w",
  role: "assistant",
  text: "Vanakkam! I'm NammaTransit AI, your Chennai public transit assistant. Ask me anything about Chennai Metro (Blue, Green, and Phase 2 Yellow Line), MTC Buses, Suburban Railway, official station-to-station fares, typo-corrected station search, or booking tickets on Chennai One.",
};

const START_CHIPS = [
  "Guindy to Chennai Airport",
  "Koyambedu to Chennai Airport",
  "Poonamallee Bypass to Vadapalani",
  "Tambaram to Guindy",
  "What is the fare for Guindy to Airport?",
];

const NAV = [
  {
    icon: Map,
    label: "Plan Journey",
    prompt: "How do I travel from Guindy to Chennai Airport?",
  },
  {
    icon: Ticket,
    label: "Official Fares & Chennai One",
    prompt: "What is the fare from Guindy to Chennai Airport and how do I book on Chennai One?",
  },
  {
    icon: TrainFront,
    label: "Phase 2 Yellow Line",
    prompt: "Show route from Poonamallee to Vadapalani on Yellow Line",
  },
  {
    icon: BellRing,
    label: "Service Updates",
    prompt: "Show service updates",
  },
  {
    icon: Accessibility,
    label: "Accessibility Facilities",
    prompt: "Is Guindy station accessible?",
  },
  {
    icon: MessageSquareWarning,
    label: "Report a Problem",
    prompt: "I want to report a problem with Chennai Metro",
  },
];

function ChatPage() {
  const [messages, setMessages] = useState<Msg[]>([WELCOME]);
  const [context, setContext] = useState<Context>({});
  const [suggestions, setSuggestions] = useState(START_CHIPS);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [conversationId, setConversationId] = useState("initial");
  const [savedConversations, setSavedConversations] = useState<Saved[]>([]);

  const activeConversationIdRef = useRef("initial");
  const requestVersionRef = useRef(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initialize theme from DOM or localStorage
  useEffect(() => {
    const isLight = document.documentElement.classList.contains("light");
    setIsDarkMode(!isLight);
  }, []);

  const toggleTheme = () => {
    if (isDarkMode) {
      document.documentElement.classList.add("light");
      setIsDarkMode(false);
    } else {
      document.documentElement.classList.remove("light");
      setIsDarkMode(true);
    }
  };

  useEffect(() => {
    let store: ConversationStore | null = null;
    try {
      store = JSON.parse(localStorage.getItem(STORE_KEY) || "null") as ConversationStore | null;
    } catch {
      store = null;
    }

    if (store?.conversations?.length) {
      const active = store.conversations.find((item) => item.id === store?.activeId) || store.conversations[0]!;
      activeConversationIdRef.current = active.id;
      setConversationId(active.id);
      setSavedConversations(store.conversations);
      setMessages(active.messages?.length ? active.messages : [WELCOME]);
      setContext(active.context ?? {});
      setSuggestions(active.suggestions ?? START_CHIPS);
    } else {
      // Migrate the previously saved single conversation without discarding it.
      let legacy: Partial<Saved> | null = null;
      try {
        legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null") as Partial<Saved> | null;
      } catch {
        legacy = null;
      }
      const id = crypto.randomUUID();
      activeConversationIdRef.current = id;
      setConversationId(id);
      if (legacy?.messages?.length) {
        setMessages(legacy.messages);
        setContext(legacy.context ?? {});
        setSuggestions(legacy.suggestions ?? START_CHIPS);
      }
    }

    setIsHydrated(true);
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const firstUserMessage = messages.find((message) => message.role === "user");
    const title = firstUserMessage?.text.slice(0, 42) || "New conversation";
    const current: Saved = {
      id: conversationId,
      title,
      updatedAt: Date.now(),
      messages,
      context,
      suggestions,
    };

    let previous: Saved[] = [];
    try {
      const store = JSON.parse(localStorage.getItem(STORE_KEY) || "null") as ConversationStore | null;
      previous = store?.conversations ?? [];
    } catch {
      previous = [];
    }

    const next = [current, ...previous.filter((item) => item.id !== conversationId)]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, 30);

    localStorage.setItem(STORE_KEY, JSON.stringify({ activeId: conversationId, conversations: next }));
    setSavedConversations(next);
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, context, suggestions, conversationId, isHydrated]);

  async function send(text: string) {
    const msg = text.trim();
    if (!msg || loading) return;

    const conversationAtStart = conversationId;
    const requestVersion = ++requestVersionRef.current;
    setOpen(false);
    setInput("");

    const history = messages
      .filter((message) => message.id !== "w")
      .map((message) => ({ role: message.role, text: message.text }))
      .slice(-16);

    setMessages((previous) => [
      ...previous,
      { id: crypto.randomUUID(), role: "user", text: msg },
    ]);
    setLoading(true);

    try {
      const response = await sendChat({ data: { message: msg, context, history } });

      // Ignore late responses from a conversation that is no longer active.
      if (activeConversationIdRef.current !== conversationAtStart ||
          requestVersionRef.current !== requestVersion) return;

      setContext(response.context);
      setSuggestions(response.suggestions);
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: response.reply,
          cards: response.cards,
        },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      if (activeConversationIdRef.current !== conversationAtStart ||
          requestVersionRef.current !== requestVersion) return;
      setMessages((previous) => [
        ...previous,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: "I'm having trouble connecting to the assistant right now. Please try again.",
          error: true,
        },
      ]);
    } finally {
      if (activeConversationIdRef.current === conversationAtStart &&
          requestVersionRef.current === requestVersion) {
        setLoading(false);
        inputRef.current?.focus();
      }
    }
  }

  function switchConversation(target: Saved) {
    requestVersionRef.current += 1;
    activeConversationIdRef.current = target.id;
    setConversationId(target.id);
    setMessages(target.messages?.length ? target.messages : [WELCOME]);
    setContext(target.context ?? {});
    setSuggestions(target.suggestions ?? START_CHIPS);
    setLoading(false);
    setInput("");
    setOpen(false);
  }

  function reset() {
    const id = crypto.randomUUID();
    requestVersionRef.current += 1;
    activeConversationIdRef.current = id;
    setConversationId(id);
    setMessages([WELCOME]);
    setContext({});
    setSuggestions(START_CHIPS);
    setLoading(false);
    setInput("");
    setOpen(false);
    inputRef.current?.focus();
  }

  const journey =
    context.origin && context.destination
      ? `${context.origin} → ${context.destination}${context.travelDate ? ` (${context.travelDate})` : ""}`
      : context.origin
        ? `From ${context.origin}`
        : context.destination
          ? `To ${context.destination}`
          : null;

  return (
    <div className="flex h-screen bg-background text-foreground transition-colors">
      {open && (
        <button
          aria-label="Close menu"
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-xs lg:hidden"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar Navigation */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-sidebar p-5 text-sidebar-foreground transition-transform lg:static lg:translate-x-0 border-r border-sidebar-border ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between">
          <Link to="/">
            <Brand light />
          </Link>

          <button
            className="lg:hidden text-sidebar-foreground"
            aria-label="Close menu"
            onClick={() => setOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <button
          onClick={reset}
          className="mt-6 flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 font-bold text-accent-foreground shadow-glow transition hover:opacity-95"
        >
          <Plus className="h-4 w-4" />
          New Conversation
        </button>

        <nav className="mt-6 space-y-1">
          {NAV.map((item) => (
            <button
              key={item.label}
              onClick={() => send(item.prompt)}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-xs font-semibold text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition"
            >
              <item.icon className="h-4 w-4 text-accent shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        {savedConversations.length > 0 && (
          <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
            <p className="mb-2 px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Recent conversations
            </p>
            <div className="space-y-1">
              {savedConversations
                .filter((item) => item.id !== conversationId)
                .slice(0, 12)
                .map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => switchConversation(item)}
                    className="w-full truncate rounded-lg px-3 py-2 text-left text-xs text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-foreground"
                    title={item.title}
                  >
                    {item.title}
                  </button>
                ))}
            </div>
          </div>
        )}

        {journey && (
          <div className="mt-5 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-3 text-xs">
            <p className="font-bold uppercase tracking-wider text-accent text-[10px]">
              Active Journey Query
            </p>
            <p className="mt-1 font-semibold text-sidebar-foreground">{journey}</p>
          </div>
        )}

        {/* Theme & Official App links in Sidebar Footer */}
        <div className="mt-auto space-y-2 pt-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="flex w-full items-center justify-between rounded-xl border border-sidebar-border bg-sidebar-accent/50 px-3 py-2 text-xs font-medium text-sidebar-foreground hover:bg-sidebar-accent transition"
          >
            <span className="flex items-center gap-2">
              {isDarkMode ? (
                <Moon className="h-3.5 w-3.5 text-accent" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-amber-500" />
              )}
              <span>{isDarkMode ? "Dark Theme" : "Light Theme"}</span>
            </span>
            <span className="text-[10px] uppercase font-bold text-muted-foreground">Toggle</span>
          </button>

          <div className="rounded-xl bg-sidebar-accent/30 p-2.5 text-[11px] text-sidebar-foreground/70 border border-sidebar-border/40">
            Official CMRL fares & Chennai One booking integration. Static GTFS datasets; live GPS
            vehicle telemetry is not active.
          </div>
        </div>
      </aside>

      {/* Main Chat Interface */}
      <main className="flex min-w-0 flex-1 flex-col">
        {/* Header Bar */}
        <header className="flex items-center gap-3 border-b border-border/80 bg-card px-4 py-3">
          <button
            className="lg:hidden text-foreground"
            aria-label="Open menu"
            onClick={() => setOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <TramFront className="h-5 w-5 text-accent" />

          <div>
            <h1 className="font-display text-sm font-bold text-foreground">
              Chennai Mobility Assistant
            </h1>
            <p className="text-[10px] text-muted-foreground hidden sm:block">
              Metro (Blue, Green, Yellow) · MTC Buses · Suburban Rail · Chennai One Ticketing
            </p>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Toggle dark/light theme"
              className="grid h-8 w-8 place-items-center rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground transition"
            >
              {isDarkMode ? (
                <Moon className="h-4 w-4 text-accent" />
              ) : (
                <Sun className="h-4 w-4 text-amber-500" />
              )}
            </button>

            {journey && (
              <span className="hidden rounded-full bg-accent/15 px-3 py-1 text-xs font-bold text-accent border border-accent/20 md:inline">
                {journey}
              </span>
            )}
          </div>
        </header>

        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto" aria-live="polite">
          <div className="mx-auto max-w-4xl space-y-5 px-4 py-6">
            {messages.map((message) =>
              message.role === "user" ? (
                <div
                  key={message.id}
                  className="animate-rise ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-xs bg-primary px-4 py-2.5 text-primary-foreground font-medium text-sm shadow-md"
                >
                  {message.text}
                </div>
              ) : (
                <div key={message.id} className="animate-rise flex gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent border border-accent/20">
                    <TramFront className="h-4 w-4" />
                  </span>

                  <div className="min-w-0 flex-1 space-y-3.5">
                    <div
                      className={`text-sm leading-relaxed text-foreground/90 ${
                        message.error ? "text-rose-400 font-medium" : ""
                      }`}
                    >
                      {message.text}
                    </div>

                    {message.cards?.map((card, index) => (
                      <ResultCard key={index} card={card} onAskFollowUp={(query) => send(query)} />
                    ))}
                  </div>
                </div>
              ),
            )}

            {loading && (
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground pl-11">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                Calculating routes and validating official station fares...
              </div>
            )}

            <div ref={endRef} />
          </div>
        </div>

        {/* Input Bar & Suggestion Chips */}
        <div className="border-t border-border/80 bg-card px-4 py-3">
          <div className="mx-auto max-w-4xl">
            {/* Quick Suggestion Chips */}
            <div className="mb-2.5 flex flex-wrap gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  disabled={loading}
                  onClick={() => send(suggestion)}
                  className="rounded-full border border-border/80 bg-secondary/60 px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:border-accent hover:text-accent hover:bg-secondary disabled:opacity-50 transition"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                send(input);
              }}
              className="flex items-end gap-2 rounded-2xl border border-border/80 bg-secondary/40 p-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent"
            >
              <textarea
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    send(input);
                  }
                }}
                placeholder="Ask about Chennai Metro, MTC Bus, Suburban rail, fares, or typo queries like 'Koyeembedu to Airport'..."
                aria-label="Message"
                className="max-h-32 flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              />

              <button
                type="submit"
                disabled={loading || !input.trim()}
                aria-label="Send"
                className="grid h-10 w-10 place-items-center rounded-xl bg-accent text-accent-foreground font-bold disabled:opacity-40 shadow-glow transition hover:bg-accent/90 shrink-0"
              >
                <SendHorizontal className="h-4 w-4" />
              </button>
            </form>

            <div className="mt-2.5">
              <Disclaimer />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
