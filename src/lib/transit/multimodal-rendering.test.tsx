import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { MultimodalJourneyOption, JourneySearchParams } from "./multimodal-types";
import {
  calculateJourneyHighlights,
  getSmartAssistantActionReply,
  planMultimodalJourneys,
} from "./multimodal-planner";
import { JourneySearchSummary } from "@/components/transit/JourneySearchSummary";
import { JourneyComparisonCard } from "@/components/transit/JourneyComparisonCard";
import { JourneyTimeline } from "@/components/transit/JourneyTimeline";
import { JourneyMap } from "@/components/transit/JourneyMap";
import { SmartJourneyAssistant } from "@/components/transit/SmartJourneyAssistant";
import { MultimodalJourneyResults } from "@/components/transit/MultimodalJourneyResults";

// Sample mock journeys for testing
const directBusOption: MultimodalJourneyOption = {
  id: "direct-bus-1",
  title: "Direct MTC Bus 21G",
  description: "Direct city bus via Mount Road",
  durationMinutes: 45,
  fare: 18,
  transferCount: 0,
  walkingDistanceMeters: 250,
  totalStops: 14,
  departureTime: "08:30:00",
  arrivalTime: "09:15:00",
  modes: ["bus"],
  legs: [
    {
      id: "leg-1",
      mode: "bus",
      lineName: "MTC Bus 21G",
      routeNumber: "21G",
      operator: "MTC",
      fromStation: "Broadway",
      toStation: "Tambaram",
      departureTime: "08:30:00",
      arrivalTime: "09:15:00",
      durationMinutes: 45,
      stopsCount: 14,
      intermediateStops: [
        { name: "Central", latitude: 13.0827, longitude: 80.2707 },
        { name: "LIC", latitude: 13.0645, longitude: 80.2662 },
        { name: "Guindy", latitude: 13.0067, longitude: 80.2023 },
      ],
      color: "#ea580c",
      walkingDistanceMeters: 0,
    },
  ],
  highlights: [],
  scheduleSource: "Static GTFS schedule",
  isLiveTracking: false,
};

const multimodalOption: MultimodalJourneyOption = {
  id: "multimodal-metro-bus",
  title: "Metro Blue Line + Transfer Walk + MTC Bus",
  description: "Metro and connecting bus interchange",
  durationMinutes: 30,
  fare: 40,
  transferCount: 1,
  walkingDistanceMeters: 450,
  totalStops: 8,
  departureTime: "08:30:00",
  arrivalTime: "09:00:00",
  modes: ["metro", "walk", "bus"],
  legs: [
    {
      id: "leg-1",
      mode: "metro",
      lineName: "Blue Line (Washermanpet - Airport)",
      operator: "Chennai Metro Rail Ltd",
      fromStation: "Chennai Central",
      toStation: "Guindy Metro",
      departureTime: "08:30:00",
      arrivalTime: "08:50:00",
      durationMinutes: 20,
      stopsCount: 5,
      intermediateStops: [
        { name: "Chennai Central", latitude: 13.0827, longitude: 80.2707 },
        { name: "Government Estate", latitude: 13.0694, longitude: 80.2721 },
        { name: "AG-DMS", latitude: 13.0456, longitude: 80.2494 },
        { name: "Nandanam", latitude: 13.0308, longitude: 80.2393 },
        { name: "Guindy Metro", latitude: 13.0067, longitude: 80.2023 },
      ],
      color: "#2563eb",
      walkingDistanceMeters: 0,
    },
    {
      id: "leg-transfer",
      mode: "walk",
      lineName: "Transfer Walk",
      operator: "Walking Transfer",
      fromStation: "Guindy Metro",
      toStation: "Guindy Bus Stand",
      departureTime: "08:50:00",
      arrivalTime: "08:54:00",
      durationMinutes: 4,
      stopsCount: 0,
      intermediateStops: [],
      walkingDistanceMeters: 250,
      walkingDurationMinutes: 4,
      color: "#64748b",
      instruction: "Walk from Metro concourse to Bus terminal",
    },
    {
      id: "leg-2",
      mode: "bus",
      lineName: "MTC Bus 54",
      routeNumber: "54",
      operator: "MTC",
      fromStation: "Guindy Bus Stand",
      toStation: "Poonamallee",
      departureTime: "08:55:00",
      arrivalTime: "09:05:00",
      durationMinutes: 10,
      stopsCount: 3,
      intermediateStops: [],
      color: "#ea580c",
      walkingDistanceMeters: 0,
    },
  ],
  highlights: [],
  scheduleSource: "Static GTFS schedule",
  isLiveTracking: false,
};

const suburbanTrainOption: MultimodalJourneyOption = {
  id: "suburban-1",
  title: "Suburban EMU South Line",
  description: "Southern Railway EMU suburban direct service",
  durationMinutes: 50,
  fare: 10,
  transferCount: 0,
  walkingDistanceMeters: 100,
  totalStops: 12,
  departureTime: "08:40:00",
  arrivalTime: "09:30:00",
  modes: ["train"],
  legs: [
    {
      id: "leg-sub",
      mode: "train",
      lineName: "Chennai Beach - Chengalpattu EMU",
      operator: "Southern Railway",
      fromStation: "Chennai Beach",
      toStation: "Tambaram",
      departureTime: "08:40:00",
      arrivalTime: "09:30:00",
      durationMinutes: 50,
      stopsCount: 12,
      intermediateStops: [
        { name: "Chennai Fort" }, // Incomplete coordinates test case
        { name: "Chennai Park" },
        { name: "Guindy Railway Station", latitude: 13.0076, longitude: 80.2031 },
      ],
      color: "#9333ea",
      walkingDistanceMeters: 0,
    },
  ],
  highlights: [],
  scheduleSource: "Static GTFS schedule",
  isLiveTracking: false,
};

describe("Multimodal Journey Planner Logic", () => {
  it("calculates accurate highlights: fastest, cheapest, and direct route", () => {
    const options = [directBusOption, multimodalOption, suburbanTrainOption];
    const highlighted = calculateJourneyHighlights(options);

    // Multimodal is 30 mins -> Fastest
    const fastest = highlighted.find((o) => o.id === "multimodal-metro-bus");
    expect(fastest?.highlights).toContain("fastest");

    // Suburban is Rs 10 -> Cheapest
    const cheapest = highlighted.find((o) => o.id === "suburban-1");
    expect(cheapest?.highlights).toContain("cheapest");

    // Direct Bus has 0 transfers -> Fewest transfers / Direct route
    const directBus = highlighted.find((o) => o.id === "direct-bus-1");
    expect(directBus?.highlights).toContain("fewest_transfers");
  });

  it("handles a single journey option without errors", () => {
    const options = [directBusOption];
    const highlighted = calculateJourneyHighlights(options);
    expect(highlighted.length).toBe(1);
    expect(highlighted[0].highlights).toContain("fewest_transfers");
  });

  it("plans multimodal journey options with direct bus and walking transfers", async () => {
    const generated = await planMultimodalJourneys(
      "Guindy",
      "Chennai Airport",
      "2026-05-10",
      "09:00:00",
    );

    expect(generated.length).toBeGreaterThan(0);
    // Should have valid properties
    expect(generated[0].durationMinutes).toBeGreaterThan(0);
    expect(generated[0].fare).toBeGreaterThan(0);
    expect(generated[0].legs.length).toBeGreaterThan(0);
    expect(generated[0].scheduleSource).toContain("GTFS");
  });

  it("handles missing coordinates and incomplete data gracefully", () => {
    const incompleteOption: MultimodalJourneyOption = {
      id: "incomplete-1",
      title: "Custom Route",
      description: "Route with missing data",
      durationMinutes: 25,
      fare: 15,
      transferCount: 0,
      walkingDistanceMeters: 0,
      totalStops: 2,
      departureTime: "10:00:00",
      arrivalTime: "10:25:00",
      modes: ["bus"],
      legs: [
        {
          id: "leg-inc",
          mode: "bus",
          lineName: "Bus X",
          operator: "MTC",
          fromStation: "Unknown Origin",
          toStation: "Unknown Destination",
          durationMinutes: 25,
          stopsCount: 2,
          color: "#ea580c",
          intermediateStops: [
            { name: "Stop Without LatLon" },
            { name: "Stop With Partial", latitude: 13.0 },
          ],
        },
      ],
      highlights: [],
      scheduleSource: "Estimated GTFS schedule",
      isLiveTracking: false,
    };

    // Should calculate highlights without error
    const highlighted = calculateJourneyHighlights([incompleteOption]);
    expect(highlighted.length).toBe(1);

    // Smart assistant reply should not crash
    const reply = getSmartAssistantActionReply("cheaper", [incompleteOption], incompleteOption.id);
    expect(reply).toBeDefined();
    expect(typeof reply).toBe("string");
  });

  it("provides grounded replies for all 6 smart assistant actions", () => {
    const options = [directBusOption, multimodalOption, suburbanTrainOption];

    const actions = [
      "cheaper",
      "fastest",
      "reduce_walking",
      "avoid_changing",
      "miss_bus",
      "metro_alternative",
    ];

    for (const action of actions) {
      const reply = getSmartAssistantActionReply(action, options, directBusOption.id);
      expect(reply).toBeDefined();
      expect(reply.length).toBeGreaterThan(15);
      expect(reply).not.toContain("undefined");
    }

    // Check specific grounded logic
    const cheaperReply = getSmartAssistantActionReply("cheaper", options, multimodalOption.id);
    expect(cheaperReply).toContain("₹");

    const fastestReply = getSmartAssistantActionReply("fastest", options, suburbanTrainOption.id);
    expect(fastestReply).toContain("minutes");
  });
});

describe("Journey Search UI Components Rendering", () => {
  const searchParams: JourneySearchParams = {
    origin: "Chennai Central",
    destination: "Tambaram",
    travelDate: "2026-05-10",
    departureTime: "08:30:00",
  };

  it("renders JourneySearchSummary with correct details and editable fields", () => {
    const handleUpdate = vi.fn();
    render(
      <JourneySearchSummary
        params={searchParams}
        totalAlternatives={3}
        onUpdateSearch={handleUpdate}
      />,
    );

    expect(screen.getByText("Chennai Central")).toBeInTheDocument();
    expect(screen.getByText("Tambaram")).toBeInTheDocument();
    expect(screen.getByText(/3 route alternatives/i)).toBeInTheDocument();
    expect(screen.getByText(/08:30/i)).toBeInTheDocument();

    // Toggle edit search
    const editBtn = screen.getByRole("button", { name: /edit search/i });
    fireEvent.click(editBtn);

    // Check input fields are displayed
    expect(screen.getByDisplayValue("Chennai Central")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tambaram")).toBeInTheDocument();

    // Submit edited search
    const updateBtn = screen.getByText("Update Results");
    fireEvent.click(updateBtn);
    expect(handleUpdate).toHaveBeenCalled();
  });

  it("renders JourneyComparisonCard with badges and highlights", () => {
    const handleSelect = vi.fn();
    const highlightedOption: MultimodalJourneyOption = {
      ...directBusOption,
      highlights: ["cheapest", "fewest_transfers"],
    };

    render(
      <JourneyComparisonCard
        option={highlightedOption}
        isSelected={true}
        onSelect={handleSelect}
      />,
    );

    expect(screen.getByText("Direct MTC Bus 21G")).toBeInTheDocument();
    expect(screen.getByText(/₹18/)).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("min")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
    expect(screen.getByText("Stops")).toBeInTheDocument();
    expect(screen.getByText(/Cheapest/i)).toBeInTheDocument();
    expect(screen.getByText(/Direct Route/i)).toBeInTheDocument();
  });

  it("renders JourneyTimeline with expandable intermediate stops and walking transfer", () => {
    render(<JourneyTimeline option={multimodalOption} />);

    // Origin and destination stations should be visible
    expect(screen.getAllByText("Chennai Central").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Guindy Metro").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/Transfer Walk/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Poonamallee").length).toBeGreaterThanOrEqual(1);

    // Expand intermediate stops
    const toggleStopsBtn = screen.getAllByText(/intermediate stops/i)[0]!;
    expect(toggleStopsBtn).toBeInTheDocument();
    fireEvent.click(toggleStopsBtn);

    // Intermediate stops should now be visible
    expect(screen.getByText("Government Estate")).toBeInTheDocument();
    expect(screen.getByText("AG-DMS")).toBeInTheDocument();
    expect(screen.getByText("Nandanam")).toBeInTheDocument();
  });

  it("renders JourneyMap with SVG elements and mode polyline", () => {
    const { container } = render(<JourneyMap option={multimodalOption} />);

    // SVG canvas should be present
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();

    // Header and modes in legend should be rendered
    expect(screen.getByText("Multimodal Route Map")).toBeInTheDocument();
    expect(screen.getByText("Metro Blue")).toBeInTheDocument();
    expect(screen.getByText("Click station dot to inspect")).toBeInTheDocument();
  });

  it("renders SmartJourneyAssistant chips and triggers follow-up queries", () => {
    const handleAskQuestion = vi.fn();
    render(
      <SmartJourneyAssistant
        options={[directBusOption, multimodalOption, suburbanTrainOption]}
        activeOptionId={multimodalOption.id}
        onAskChatQuestion={handleAskQuestion}
      />,
    );

    expect(screen.getByText("Smart Route Insights")).toBeInTheDocument();

    // Click "Is there a cheaper option?"
    const cheaperChip = screen.getByText(/Is there a cheaper option\?/i);
    fireEvent.click(cheaperChip);

    // An answer card should appear with the grounded advice
    expect(screen.getByText(/Suburban EMU South Line/i)).toBeInTheDocument();

    // Click "Discuss this in chat" button
    const askChatBtn = screen.getByText(/Discuss this in chat/i);
    fireEvent.click(askChatBtn);
    expect(handleAskQuestion).toHaveBeenCalledWith(expect.stringMatching(/cheaper/i));
  });

  it("renders MultimodalJourneyResults container with tabs and alternative switching", () => {
    const options = [directBusOption, multimodalOption, suburbanTrainOption];
    render(
      <MultimodalJourneyResults
        origin="Chennai Central"
        destination="Tambaram"
        travelDate="2026-05-10"
        departureTime="08:30"
        initialOptions={options}
      />,
    );

    // Journey Search Summary should be present with the stations
    expect(screen.getAllByText("Chennai Central").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tambaram").length).toBeGreaterThan(0);

    // Comparison cards should be visible
    expect(screen.getAllByText("Direct MTC Bus 21G").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getAllByText("Metro Blue Line + Transfer Walk + MTC Bus").length,
    ).toBeGreaterThanOrEqual(1);

    // Click to select the second option
    const secondCard = screen.getAllByText("Metro Blue Line + Transfer Walk + MTC Bus")[0]!;
    fireEvent.click(secondCard);

    // Check timeline switched to second option
    expect(screen.getAllByText("Guindy Metro").length).toBeGreaterThanOrEqual(1);
  });
});
