// Query Parser — extracts intent, role, location, experience
// Uses context (memory) so follow-up messages like "2 yr experience"
// inherit role + location from the previous turn

const INTENT_KEYWORDS = {
  salary:  ["salary", "pay", "package", "ctc", "lpa", "lakhs", "compensation", "stipend", "earn", "income"],
  reviews: ["review", "reviews", "glassdoor", "culture", "rating", "opinion", "feedback", "workplace", "ambitionbox"],
  jobs:    ["job", "jobs", "hiring", "opening", "position", "vacancy", "vacancies", "work", "role", "career", "find"],
};

const CITIES = [
  "chennai", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad",
  "pune", "kolkata", "ahmedabad", "jaipur", "noida", "gurgaon", "gurugram",
  "coimbatore", "kochi", "mysore", "surat", "vadodara", "nagpur", "indore",
  "remote", "india", "pan india",
  "new york", "london", "dubai", "singapore", "toronto",
];

// These are ONLY experience/filter signals — NOT a role change
const FILTER_ONLY_PATTERNS = [
  /^\d+\s*(yr|yrs|year|years)\s*(exp|experience)?$/i,   // "2 yr experience"
  /^(fresher|freshers)$/i,                               // "fresher"
  /^(remote|wfh|work from home)$/i,                      // "remote"
  /^(full.?time|part.?time|contract|freelance)$/i,       // job type only
  /^(show|list|more|next|again)$/i,                      // navigation commands
];

const EXPERIENCE_PATTERNS = [
  /(\d+)\s*(?:\+)?\s*(?:year|yr|yrs|years)\s*(?:of\s*)?(?:exp(?:erience)?)?/i,
  /fresher|freshers|entry.?level/i,
];

// Words to strip when isolating the job role
const NOISE_WORDS = new Set([
  "jobs", "job", "in", "at", "for", "find", "show", "search", "get",
  "hiring", "openings", "vacancies", "vacancy", "near", "available",
  "salary", "reviews", "experience", "exp", "work", "position",
  "i", "am", "looking", "for", "need", "want", "a", "an", "the",
  "please", "can", "you", "help", "me",
  ...CITIES,
]);

export function parseQuery(message, context = {}) {
  const lower   = message.toLowerCase().trim();
  const trimmed = lower.replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

  // ── 1. Is this a FILTER-ONLY message? ─────────────────────────────────────
  // If user types ONLY "2 yr experience" or "remote", don't parse a new role
  // Just update the filter and keep existing role+location from context
  const isFilterOnly = FILTER_ONLY_PATTERNS.some((p) => p.test(trimmed));

  // ── 2. Detect Intent ───────────────────────────────────────────────────────
  let intent = "jobs"; // default
  for (const [key, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      intent = key;
      break;
    }
  }
  // Override: if message is purely a filter, keep intent as jobs
  if (isFilterOnly) intent = "jobs";

  // ── 3. Extract Experience ──────────────────────────────────────────────────
  let experience = context.experience || null;
  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      experience = /fresher|entry/i.test(message) ? "Fresher" : `${match[1]} years`;
      break;
    }
  }

  // ── 4. Extract Location ────────────────────────────────────────────────────
  // Start with remembered location — only update if a city is found in message
  let location = context.location || null;
  for (const city of CITIES) {
    if (lower.includes(city)) {
      location = toTitleCase(city);
      break;
    }
  }
  // "in Chennai" pattern for cities not in our list
  const inMatch = message.match(/\bin\s+([A-Z][a-zA-Z]+(?:\s[A-Z][a-zA-Z]+)?)/);
  if (inMatch && !location) location = inMatch[1];

  // ── 5. Extract Role ────────────────────────────────────────────────────────
  // CRITICAL: If this is a filter-only message, keep existing role from context
  let role = context.role || null;

  if (!isFilterOnly) {
    // Strip noise words to isolate the job role
    let words = trimmed.split(" ").filter((w) => !NOISE_WORDS.has(w));

    // Also remove experience tokens like "2", "yr", "years"
    words = words.filter((w) => !/^\d+$/.test(w) && !/^(yr|yrs|years|exp|experience|fresher)$/i.test(w));

    const extracted = words.join(" ").trim();

    if (extracted.length > 2) {
      // Only update role if we actually extracted something meaningful
      role = toTitleCase(extracted);
    }
    // If extraction produced nothing, fall back to context role
    if (!role || role.length <= 2) role = context.role;
  }

  return { intent, role, location, experience };
}

function toTitleCase(str) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}