// Simple NLP parser — no OpenAI needed, works offline
// Extracts intent, role, location from natural language

const INTENT_KEYWORDS = {
  salary:  ["salary", "pay", "package", "ctc", "lpa", "lakhs", "compensation", "stipend", "earn"],
  reviews: ["review", "reviews", "glassdoor", "culture", "rating", "opinion", "feedback", "workplace"],
  jobs:    ["job", "jobs", "hiring", "opening", "position", "vacancy", "vacancies", "work", "role", "career"],
};

const LOCATIONS = [
  "chennai", "bangalore", "bengaluru", "mumbai", "delhi", "hyderabad",
  "pune", "kolkata", "ahmedabad", "jaipur", "noida", "gurgaon", "gurugram",
  "coimbatore", "kochi", "remote", "india",
  // International
  "new york", "london", "dubai", "singapore", "toronto",
];

const EXPERIENCE_PATTERNS = [
  /(\d+)\s*(?:year|yr|yrs|years)\s*(?:exp|experience)?/i,
  /(\d+)\s*\+\s*(?:year|yr|yrs|years)/i,
  /fresher|freshers/i,
];

export function parseQuery(message, context = {}) {
  const lower = message.toLowerCase();

  // ── Detect Intent ──────────────────────────────────────────────
  let intent = "jobs"; // default
  for (const [key, keywords] of Object.entries(INTENT_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      intent = key;
      break;
    }
  }

  // ── Extract Location ───────────────────────────────────────────
  let location = context.location || null;
  for (const loc of LOCATIONS) {
    if (lower.includes(loc)) {
      location = loc.charAt(0).toUpperCase() + loc.slice(1);
      break;
    }
  }
  // "in <City>" pattern for unknown cities
  const inMatch = message.match(/\bin\s+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  if (inMatch && !location) location = inMatch[1];

  // ── Extract Role ───────────────────────────────────────────────
  let role = context.role || null;

  // Remove known noise words to isolate role
  const noiseWords = [
    "jobs", "job", "in", "at", "for", "find", "show", "search",
    "hiring", "openings", "vacancies", "near", ...LOCATIONS,
    "salary", "reviews", "experience",
  ];

  let cleaned = lower;
  noiseWords.forEach((w) => {
    cleaned = cleaned.replace(new RegExp(`\\b${w}\\b`, "gi"), "").trim();
  });
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  if (cleaned.length > 2) {
    role = toTitleCase(cleaned);
  }

  // Fall back to context if we couldn't extract
  if (!role) role = context.role;

  // ── Extract Experience ─────────────────────────────────────────
  let experience = null;
  for (const pattern of EXPERIENCE_PATTERNS) {
    const match = message.match(pattern);
    if (match) {
      experience = /fresher/i.test(message) ? "Fresher" : `${match[1]} years`;
      break;
    }
  }

  return { intent, role, location, experience };
}

function toTitleCase(str) {
  return str
    .split(" ")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}
