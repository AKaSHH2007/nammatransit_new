/**
 * Intelligent Location Typo Correction and Station Resolution Engine
 *
 * Capabilities:
 * 1. Exact & case-insensitive matching
 * 2. Whitespace, punctuation and transit suffix normalization (e.g. 'T Nagar', 't.nagar' -> 'T. Nagar')
 * 3. Curated alias dictionary for Chennai transit hubs & common misspellings
 * 4. Fuzzy Levenshtein string distance matching
 * 5. Tamil / Indian phonetic normalization (ee <-> i, oo <-> u, th <-> t, ai <-> ay, etc.)
 * 6. Multilingual Tamil script transliteration mapping (கோயம்பேடு -> Koyambedu)
 * 7. Ambiguity detection: Solicits user clarification rather than silently guessing
 */

import { ALL_STATIONS, ALIASES } from "./data";
import { YELLOW_LINE_STATIONS } from "./yellow-line.data";

export interface ResolutionResult {
  input: string;
  resolved: string | null;
  matchedName?: string | null;
  canonicalName: string | null;
  confidence: number; // 0 to 1
  isCorrected: boolean;
  correctionMessage?: string;
  isAmbiguous?: boolean;
  ambiguousCandidates?: string[];
  suggestions?: string[];
  operatorHint?: "metro" | "bus" | "train" | "any";
}

// Full canonical Chennai transit station list
export const CANONICAL_CHENNAI_STATIONS: string[] = Array.from(
  new Set([
    ...ALL_STATIONS,
    ...YELLOW_LINE_STATIONS.map((s) => s.name),
    "Chennai Central",
    "Chennai Airport",
    "Koyambedu",
    "Guindy",
    "Alandur",
    "Vadapalani",
    "Thirumangalam",
    "Poonamallee",
    "Poonamallee Bypass",
    "T. Nagar",
    "Tambaram",
    "Saidapet",
    "Egmore",
    "Chennai Beach",
    "St. Thomas Mount",
    "Wimco Nagar Metro",
    "Wimco Nagar",
    "Chromepet",
    "Meenambakkam",
    "Nanganallur Road",
    "Ashok Nagar",
    "Arumbakkam",
    "Anna Nagar Tower",
    "Anna Nagar East",
    "Shenoy Nagar",
    "Kilpauk",
    "Nehru Park",
    "High Court",
    "Government Estate",
    "LIC",
    "Thousand Lights",
    "AG-DMS",
    "Teynampet",
    "Nandanam",
    "Little Mount",
    "Ekkattuthangal",
    "Porur",
    "Porur Junction",
    "Iyappanthangal",
    "Kattupakkam",
    "Karayanchavadi",
    "Kumananchavadi",
    "Valasaravakkam",
    "Saligramam",
    "Adyar",
    "Velachery",
  ]),
);

export const CANONICAL_STATIONS = CANONICAL_CHENNAI_STATIONS;

// Curated dictionary for common typos, phonetic variants, and colloquial aliases
const COMMON_ALIASES: Record<string, string> = {
  // Koyambedu variations
  koyeembedu: "Koyambedu",
  koyembedu: "Koyambedu",
  koyambedu: "Koyambedu",
  koyambeduu: "Koyambedu",
  koyamped: "Koyambedu",
  koyambad: "Koyambedu",
  cmbt: "Koyambedu",
  "cmbt bus stand": "Koyambedu",
  "koyambedu bus stand": "Koyambedu",
  "koyambedu bus terminus": "Koyambedu",
  "koyambedu metro": "Koyambedu",

  // Guindy variations
  gindi: "Guindy",
  guindi: "Guindy",
  gindy: "Guindy",
  gundy: "Guindy",
  guindy: "Guindy",
  "guindy metro": "Guindy",
  "guindy railway station": "Guindy",
  "guindy bus stand": "Guindy",
  "guindy r.s": "Guindy",

  // Thirumangalam variations
  thirumangalam: "Thirumangalam",
  tirumangalam: "Thirumangalam",
  thirumangalm: "Thirumangalam",
  tirumangalamm: "Thirumangalam",
  thirumangalammetro: "Thirumangalam",
  "thirumangalam metro": "Thirumangalam",

  // T. Nagar variations
  "t nagar": "T. Nagar",
  "t.nagar": "T. Nagar",
  "t-nagar": "T. Nagar",
  tnagar: "T. Nagar",
  "thyagaraya nagar": "T. Nagar",
  thiyagarayanagar: "T. Nagar",
  thiyagaraya: "T. Nagar",
  "t nagar bus stand": "T. Nagar",
  "t nagar bus terminus": "T. Nagar",

  // Poonamallee variations
  poonamali: "Poonamallee",
  poonamalle: "Poonamallee",
  poonamallee: "Poonamallee",
  punamallee: "Poonamallee",
  punamali: "Poonamallee",
  poonamally: "Poonamallee",
  "poonamallee bypass": "Poonamallee Bypass",
  "poonamali bypass": "Poonamallee Bypass",
  "poonamalle bus stand": "Poonamallee",

  // Vadapalani variations
  vadapalani: "Vadapalani",
  vadapalany: "Vadapalani",
  vadapalanii: "Vadapalani",
  vadaipalani: "Vadapalani",
  "vadapalani metro": "Vadapalani",
  "vadapalani bus terminus": "Vadapalani",

  // Wimco Nagar variations
  wimco: "Wimco Nagar Metro",
  "wimco nagar": "Wimco Nagar Metro",
  "wimco nagar metro": "Wimco Nagar Metro",
  "vimco nagar": "Wimco Nagar Metro",
  vimco: "Wimco Nagar Metro",
  wimconagar: "Wimco Nagar Metro",

  // Chennai Airport variations
  airport: "Chennai Airport",
  "chennai airport": "Chennai Airport",
  airpot: "Chennai Airport",
  aeroport: "Chennai Airport",
  aerodrome: "Chennai Airport",
  "meenambakkam airport": "Chennai Airport",
  "airport metro": "Chennai Airport",
  "chennai airport metro": "Chennai Airport",

  // Chennai Central variations
  central: "Chennai Central",
  "chennai central": "Chennai Central",
  "mgr central": "Chennai Central",
  "central metro": "Chennai Central",
  "central railway station": "Chennai Central",
  "chennai central metro": "Chennai Central",
  "puratchi thalaivar dr.m.g.ramachandran central metro": "Chennai Central",
  "puratchi thalaivar": "Chennai Central",

  // Tambaram variations
  tambaram: "Tambaram",
  thambaram: "Tambaram",
  tambaramstation: "Tambaram",
  "tambaram bus stand": "Tambaram",
  "tambaram railway station": "Tambaram",
  "tambaram sanatorium": "Tambaram Sanatorium",

  // Chromepet variations
  chrompet: "Chromepet",
  chromepet: "Chromepet",
  chromepett: "Chromepet",

  // Saidapet variations
  saidapet: "Saidapet",
  saidapettai: "Saidapet",
  "saidapet metro": "Saidapet",

  // Alandur variations
  alandur: "Alandur",
  alandhur: "Alandur",
  "arignar anna alandur": "Alandur",
  "alandur metro": "Alandur",

  // Porur variations
  porur: "Porur",
  "porur junction": "Porur Junction",
  "porur jn": "Porur Junction",
  "porur bypass": "Porur Bypass",

  // Egmore variations
  egmore: "Egmore",
  "chennai egmore": "Egmore",
  "egmore metro": "Egmore",
  "egmore railway station": "Egmore",

  // St. Thomas Mount variations
  "st thomas mount": "St. Thomas Mount",
  "st. thomas mount": "St. Thomas Mount",
  "st.thomas mount": "St. Thomas Mount",
  "thomas mount": "St. Thomas Mount",
  "mount metro": "St. Thomas Mount",
};

// Tamil script transliteration mappings for Chennai transit locations
const TAMIL_SCRIPT_MAP: Record<string, string> = {
  கோயம்பேடு: "Koyambedu",
  கிண்டி: "Guindy",
  தாம்பரம்: "Tambaram",
  "சென்னை சென்ட்ரல்": "Chennai Central",
  சென்ட்ரல்: "Chennai Central",
  "விமான நிலையம்": "Chennai Airport",
  ஏர்போர்ட்: "Chennai Airport",
  வடபழனி: "Vadapalani",
  திருமங்கலம்: "Thirumangalam",
  பூந்தமல்லி: "Poonamallee",
  ஆலந்தூர்: "Alandur",
  சைதாப்பேட்டை: "Saidapet",
  எழும்பூர்: "Egmore",
  "தி. நகர்": "T. Nagar",
  போரூர்: "Porur",
  "அசோக் நகர்": "Ashok Nagar",
  அரும்பாக்கம்: "Arumbakkam",
};

/**
 * Clean & normalize input string:
 * - Lowercase, trim
 * - Remove transit boilerplate like "metro", "station", "bus stand", "r.s", "b.t"
 * - Collapse whitespace & strip non-alphanumeric except dots
 */
export function cleanTransitInput(input: string): string {
  if (!input) return "";
  return input
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(
      /\b(metro|station|railway|jn\.?|depot|bus|terminus|stand|platform|stop|junction|r\.s|b\.t|b\.s)\b/g,
      " ",
    )
    .replace(/[^a-z0-9. ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Tamil & Indian phonetic normalization
 * Maps equivalent phonetic representations so sound-alike words match
 */
export function phoneticNormalize(str: string): string {
  return str
    .toLowerCase()
    .replace(/ee+/g, "i")
    .replace(/oo+/g, "u")
    .replace(/th/g, "t")
    .replace(/ai/g, "ay")
    .replace(/zh/g, "l")
    .replace(/ph/g, "f")
    .replace(/ck/g, "k")
    .replace(/c(?=[eiy])/g, "s")
    .replace(/c/g, "k")
    .replace(/(.)\1+/g, "$1") // collapse double consonants (e.g. ll -> l, mm -> m)
    .replace(/[^a-z0-9]/g, "")
    .trim();
}

/**
 * Standard Levenshtein distance calculation
 */
export function levenshteinDistance(a: string, b: string): number {
  const an = a.length;
  const bn = b.length;
  if (an === 0) return bn;
  if (bn === 0) return an;

  const matrix = Array.from({ length: bn + 1 }, (_, i) => [i]);
  for (let j = 0; j <= an; j++) {
    matrix[0]![j] = j;
  }

  for (let i = 1; i <= bn; i++) {
    for (let j = 1; j <= an; j++) {
      if (b[i - 1] === a[j - 1]) {
        matrix[i]![j] = matrix[i - 1]![j - 1]!;
      } else {
        matrix[i]![j] = Math.min(
          matrix[i - 1]![j - 1]! + 1, // substitution
          matrix[i]![j - 1]! + 1, // insertion
          matrix[i - 1]![j]! + 1, // deletion
        );
      }
    }
  }

  return matrix[bn]![an]!;
}

/**
 * Intelligent location resolution for any Chennai transport location query
 */
function resolveLocationRaw(rawInput: string): ResolutionResult {
  const input = (rawInput || "").trim();
  if (!input) {
    return {
      input,
      resolved: null,
      canonicalName: null,
      confidence: 0,
      isCorrected: false,
    };
  }

  // 1. Check Tamil Script mapping
  for (const [tamil, canonical] of Object.entries(TAMIL_SCRIPT_MAP)) {
    if (input.includes(tamil) || tamil.includes(input)) {
      return {
        input,
        resolved: canonical,
        canonicalName: canonical,
        confidence: 0.98,
        isCorrected: true,
        correctionMessage: `I understood your location as ${canonical}.`,
      };
    }
  }

  const clean = cleanTransitInput(input);
  const rawLower = input.toLowerCase().trim();

  // 2. Check exact alias dictionary match
  if (COMMON_ALIASES[rawLower]) {
    const canonical = COMMON_ALIASES[rawLower]!;
    const isCorrected = canonical.toLowerCase() !== rawLower;
    return {
      input,
      resolved: canonical,
      canonicalName: canonical,
      confidence: 1.0,
      isCorrected,
      correctionMessage: isCorrected ? `I understood your location as ${canonical}.` : undefined,
    };
  }

  if (COMMON_ALIASES[clean]) {
    const canonical = COMMON_ALIASES[clean]!;
    const isCorrected = canonical.toLowerCase() !== clean;
    return {
      input,
      resolved: canonical,
      canonicalName: canonical,
      confidence: 0.98,
      isCorrected,
      correctionMessage: isCorrected ? `I understood your location as ${canonical}.` : undefined,
    };
  }

  // 3. Exact matching in canonical stations
  for (const station of CANONICAL_CHENNAI_STATIONS) {
    const stClean = cleanTransitInput(station);
    if (stClean === clean || station.toLowerCase() === rawLower) {
      return {
        input,
        resolved: station,
        canonicalName: station,
        confidence: 1.0,
        isCorrected: false,
      };
    }
  }

  // 4. Substring / Prefix matching in canonical stations
  const substringMatches = CANONICAL_CHENNAI_STATIONS.filter((s) => {
    const sClean = cleanTransitInput(s);
    return (
      (clean.length >= 4 && sClean.includes(clean)) ||
      (sClean.length >= 4 && clean.includes(sClean))
    );
  });

  if (substringMatches.length === 1) {
    const match = substringMatches[0]!;
    return {
      input,
      resolved: match,
      canonicalName: match,
      confidence: 0.92,
      isCorrected: true,
      correctionMessage: `I understood your location as ${match}.`,
    };
  } else if (substringMatches.length > 1) {
    // Ambiguity among substring candidates
    return {
      input,
      resolved: substringMatches[0]!,
      canonicalName: substringMatches[0]!,
      confidence: 0.75,
      isCorrected: true,
      isAmbiguous: true,
      ambiguousCandidates: substringMatches.slice(0, 3),
      correctionMessage: `Did you mean ${substringMatches.slice(0, 3).join(" or ")}?`,
    };
  }

  // 5. Phonetic matching
  const phonInput = phoneticNormalize(clean);
  const phoneticMatches: Array<{ station: string; distance: number }> = [];

  for (const station of CANONICAL_CHENNAI_STATIONS) {
    const phonStation = phoneticNormalize(cleanTransitInput(station));
    if (phonInput === phonStation) {
      return {
        input,
        resolved: station,
        canonicalName: station,
        confidence: 0.94,
        isCorrected: true,
        correctionMessage: `I understood your location as ${station}.`,
      };
    }
    const dist = levenshteinDistance(phonInput, phonStation);
    if (dist <= 2) {
      phoneticMatches.push({ station, distance: dist });
    }
  }

  if (phoneticMatches.length === 1) {
    const match = phoneticMatches[0]!.station;
    return {
      input,
      resolved: match,
      canonicalName: match,
      confidence: 0.88,
      isCorrected: true,
      correctionMessage: `I understood your location as ${match}.`,
    };
  }

  // 6. Fuzzy Levenshtein Distance Matching
  const fuzzyScored: Array<{ station: string; distance: number; ratio: number }> = [];

  for (const station of CANONICAL_CHENNAI_STATIONS) {
    const stClean = cleanTransitInput(station);
    const dist = levenshteinDistance(clean, stClean);
    const maxLen = Math.max(clean.length, stClean.length);
    const ratio = (maxLen - dist) / maxLen;

    // Distance threshold: <= 2 for words <= 7 letters, <= 3 for words > 7 letters
    const maxAllowedDist = clean.length <= 7 ? 2 : 3;
    if (dist <= maxAllowedDist && ratio >= 0.65) {
      fuzzyScored.push({ station, distance: dist, ratio });
    }
  }

  fuzzyScored.sort((a, b) => b.ratio - a.ratio || a.distance - b.distance);

  if (fuzzyScored.length === 1) {
    const best = fuzzyScored[0]!;
    return {
      input,
      resolved: best.station,
      canonicalName: best.station,
      confidence: best.ratio,
      isCorrected: true,
      correctionMessage: `I understood your location as ${best.station}.`,
    };
  }

  if (fuzzyScored.length > 1) {
    const first = fuzzyScored[0]!;
    const second = fuzzyScored[1]!;

    // If top match is clearly ahead (ratio diff >= 0.15), accept it
    if (first.ratio - second.ratio >= 0.15) {
      return {
        input,
        resolved: first.station,
        canonicalName: first.station,
        confidence: first.ratio,
        isCorrected: true,
        correctionMessage: `I understood your location as ${first.station}.`,
      };
    }

    // Otherwise, flag as ambiguous and prompt for clarification
    const candidates = Array.from(new Set(fuzzyScored.slice(0, 3).map((f) => f.station)));
    return {
      input,
      resolved: first.station,
      canonicalName: first.station,
      confidence: first.ratio,
      isCorrected: true,
      isAmbiguous: true,
      ambiguousCandidates: candidates,
      correctionMessage: `Did you mean ${candidates.join(" or ")}?`,
    };
  }

  // 7. No confident match found
  return {
    input,
    resolved: null,
    canonicalName: null,
    confidence: 0,
    isCorrected: false,
  };
}

export function resolveLocation(rawInput: string): ResolutionResult {
  const r = resolveLocationRaw(rawInput);
  return {
    ...r,
    matchedName: r.matchedName ?? r.canonicalName ?? r.resolved,
    suggestions: r.suggestions ?? r.ambiguousCandidates ?? [],
  };
}

/**
 * Extract and resolve origin and destination from conversational text
 */
export function extractAndResolveLocations(text: string): {
  origin?: ResolutionResult;
  destination?: ResolutionResult;
  disambiguationPrompt?: string;
} {
  const normText = cleanTransitInput(text);

  // Match patterns like "from X to Y", "start from X reach Y", "between X and Y"
  const fromToMatch = text.match(
    /\b(?:from|starting from|start at|board at|leave)\s+([a-zA-Z0-9. ']+?)\s+(?:to|towards|reach|till|heading to)\s+([a-zA-Z0-9. ']+)(?:$|\?|[.,!])/i,
  );

  if (fromToMatch && fromToMatch[1] && fromToMatch[2]) {
    const origin = resolveLocation(fromToMatch[1]);
    const destination = resolveLocation(fromToMatch[2]);
    let prompt: string | undefined;

    if (origin.isAmbiguous && origin.ambiguousCandidates) {
      prompt = `For your starting point "${origin.input}", did you mean ${origin.ambiguousCandidates.join(" or ")}?`;
    } else if (destination.isAmbiguous && destination.ambiguousCandidates) {
      prompt = `For your destination "${destination.input}", did you mean ${destination.ambiguousCandidates.join(" or ")}?`;
    }

    return { origin, destination, disambiguationPrompt: prompt };
  }

  // Single destination patterns: "to airport", "go to vadapalani"
  const toMatch = text.match(
    /\b(?:to|reach|towards|till|going to)\s+([a-zA-Z0-9. ']+)(?:$|\?|[.,!])/i,
  );
  if (toMatch && toMatch[1]) {
    const destination = resolveLocation(toMatch[1]);
    return { destination };
  }

  // Single origin pattern: "from guindy"
  const fromMatch = text.match(
    /\b(?:from|starting at|start from|board at)\s+([a-zA-Z0-9. ']+)(?:$|\?|[.,!])/i,
  );
  if (fromMatch && fromMatch[1]) {
    const origin = resolveLocation(fromMatch[1]);
    return { origin };
  }

  return {};
}
