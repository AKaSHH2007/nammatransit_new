/**
 * Extracts a travel date from user text if provided.
 * Supports:
 * - YYYY-MM-DD (e.g. 2026-11-05)
 * - DD-MM-YYYY or DD/MM/YYYY (e.g. 05-11-2026 or 05/11/2026)
 * - "today", "tomorrow"
 */
export function extractTravelDate(message: string, baseDate = new Date()): string | undefined {
  const normMsg = message.toLowerCase();

  // Match YYYY-MM-DD
  const isoMatch = message.match(/\b(20\d{2})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])\b/);
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
  }

  // Match DD-MM-YYYY or DD/MM/YYYY
  const dmyMatch = message.match(/\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](20\d{2})\b/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  }

  // Relative dates: today, tomorrow
  if (/\btoday\b/.test(normMsg)) {
    return baseDate.toISOString().slice(0, 10);
  }
  if (/\btomorrow\b/.test(normMsg)) {
    const nextDay = new Date(baseDate);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);
    return nextDay.toISOString().slice(0, 10);
  }

  return undefined;
}

/**
 * Extracts optional departure time filter (HH:MM or HH:MM:SS or 9am / 4pm)
 */
export function extractDepartureTime(message: string): string | undefined {
  const match12 = message.match(/\b(1[0-2]|0?[1-9])(?::([0-5]\d))?\s*(am|pm)\b/i);
  if (match12) {
    let hours = Number(match12[1]);
    const minutes = match12[2] || "00";
    const ampm = match12[3]!.toLowerCase();
    if (ampm === "pm" && hours < 12) hours += 12;
    if (ampm === "am" && hours === 12) hours = 0;
    return `${String(hours).padStart(2, "0")}:${minutes}:00`;
  }

  const match24 = message.match(/\b([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?\b/);
  if (match24) {
    const hh = match24[1]!.padStart(2, "0");
    const mm = match24[2]!;
    const ss = match24[3] || "00";
    return `${hh}:${mm}:${ss}`;
  }

  return undefined;
}

import type { ModeConstraint, ModePreference } from "./multimodal-types";

/**
 * Extracts transport mode preferences or strict mode constraints from the query.
 * e.g., "by metro" -> preferredMode = "metro"
 * e.g., "metro only" -> modeConstraint = "metro", preferredMode = "metro"
 */
export function extractModePreferences(message: string): {
  preferredMode?: ModePreference;
  modeConstraint?: ModeConstraint;
} {
  const norm = message.toLowerCase();

  let modeConstraint: ModeConstraint | undefined;
  let preferredMode: ModePreference | undefined;

  // Strict constraints first
  if (/\b(?:metro\s+only|only\s+metro|just\s+metro|strictly\s+metro)\b/.test(norm)) {
    modeConstraint = "metro";
    preferredMode = "metro";
  } else if (
    /\b(?:bus\s+only|only\s+bus|just\s+bus|strictly\s+bus|mtc\s+only|only\s+mtc)\b/.test(norm)
  ) {
    modeConstraint = "bus";
    preferredMode = "bus";
  } else if (
    /\b(?:train\s+only|only\s+train|suburban\s+only|only\s+suburban|rail\s+only|emu\s+only)\b/.test(
      norm,
    )
  ) {
    modeConstraint = "train";
    preferredMode = "train";
  } else {
    // Mode preferences
    if (
      /\b(?:by\s+metro|in\s+metro|via\s+metro|take\s+metro|use\s+metro|prefer\s+metro|metro\s+train|through\s+metro)\b/.test(
        norm,
      )
    ) {
      preferredMode = "metro";
    } else if (
      /\b(?:by\s+bus|in\s+bus|via\s+bus|take\s+bus|use\s+bus|prefer\s+bus|mtc\s+bus|through\s+bus)\b/.test(
        norm,
      )
    ) {
      preferredMode = "bus";
    } else if (
      /\b(?:by\s+train|in\s+train|via\s+train|take\s+train|use\s+train|prefer\s+train|suburban|by\s+rail|emu)\b/.test(
        norm,
      )
    ) {
      preferredMode = "train";
    }
  }

  return { preferredMode, modeConstraint };
}
