import { useState } from "react";
import {
  Bus,
  Clock,
  Coins,
  Footprints,
  Layers,
  MessageSquare,
  Repeat,
  Sparkles,
  TrainFront,
  X,
  Zap,
} from "lucide-react";
import type { MultimodalJourneyOption } from "@/lib/transit/multimodal-types";
import { getSmartAssistantActionReply } from "@/lib/transit/multimodal-planner";

interface SmartJourneyAssistantProps {
  options: MultimodalJourneyOption[];
  activeOptionId: string;
  onAskChatQuestion?: (prompt: string) => void;
}

const ACTION_PROMPTS = [
  {
    id: "cheaper",
    label: "Is there a cheaper option?",
    icon: Coins,
  },
  {
    id: "fastest",
    label: "Which route is fastest?",
    icon: Zap,
  },
  {
    id: "reduce_walking",
    label: "Can I reduce walking?",
    icon: Footprints,
  },
  {
    id: "avoid_changing",
    label: "Can I avoid changing routes?",
    icon: Repeat,
  },
  {
    id: "metro_alternative",
    label: "Show me the Metro alternative",
    icon: TrainFront,
  },
  {
    id: "bus_alternative",
    label: "Show bus alternatives",
    icon: Bus,
  },
  {
    id: "mixed_alternative",
    label: "Show mixed journeys",
    icon: Layers,
  },
  {
    id: "compare_all",
    label: "Compare all options",
    icon: Sparkles,
  },
  {
    id: "miss_bus",
    label: "What if I miss my ride?",
    icon: Clock,
  },
];

export function SmartJourneyAssistant({
  options,
  activeOptionId,
  onAskChatQuestion,
}: SmartJourneyAssistantProps) {
  const [activeReply, setActiveReply] = useState<{
    prompt: string;
    text: string;
  } | null>(null);

  const handleActionClick = (action: (typeof ACTION_PROMPTS)[0]) => {
    const text = getSmartAssistantActionReply(action.id, options, activeOptionId);
    setActiveReply({
      prompt: action.label,
      text,
    });
  };

  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 border-b pb-2.5">
        <Sparkles className="h-4 w-4 text-accent" />
        <h4 className="font-display text-sm font-semibold text-foreground">Smart Route Insights</h4>
        <span className="text-xs text-muted-foreground">
          Instant answers grounded in Chennai transit datasets
        </span>
      </div>

      {/* Action Chips Grid */}
      <div className="mt-3 flex flex-wrap gap-2">
        {ACTION_PROMPTS.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.id}
              type="button"
              onClick={() => handleActionClick(action)}
              className="inline-flex items-center gap-1.5 rounded-full border bg-background px-3 py-1.5 text-xs font-medium text-foreground transition hover:border-accent hover:bg-accent-soft hover:text-accent"
            >
              <Icon className="h-3.5 w-3.5 text-accent" />
              {action.label}
            </button>
          );
        })}
      </div>

      {/* Answer Callout Card */}
      {activeReply && (
        <div className="mt-3 rounded-xl border border-accent/40 bg-accent-soft/40 p-3.5 animate-rise text-left">
          <div className="flex items-start justify-between gap-2">
            <span className="text-xs font-bold text-accent">Q: {activeReply.prompt}</span>
            <button
              type="button"
              onClick={() => setActiveReply(null)}
              className="rounded p-0.5 text-muted-foreground hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          <p className="mt-1 text-xs text-foreground/90 leading-relaxed">{activeReply.text}</p>

          {onAskChatQuestion && (
            <button
              type="button"
              onClick={() => {
                onAskChatQuestion(activeReply.prompt);
                setActiveReply(null);
              }}
              className="mt-2.5 inline-flex items-center gap-1 text-[11px] font-semibold text-accent hover:underline"
            >
              <MessageSquare className="h-3 w-3" /> Discuss this in chat conversation
            </button>
          )}
        </div>
      )}
    </div>
  );
}
