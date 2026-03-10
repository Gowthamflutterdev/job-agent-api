import express from "express";
import cors    from "cors";
import path    from "path";
import { fileURLToPath } from "url";

import { orchestrate         } from "./services/scraperOrchestrator.js";
import { parseQuery          } from "./services/queryParser.js";
import { parseWithGemini     } from "./services/llmService.js";
import { getContext, updateContext } from "./services/contextManager.js";
import {
  formatJobsReply,
  formatSalaryReply,
  formatErrorReply,
  formatClarificationReply,
} from "./services/responseFormatter.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ─────────────────────────────────────────────────────────────────────────────
// POST /chat  ← Flutter
// Body:     { sessionId, message }
// Response: { reply, jobs, intent, context }
// ─────────────────────────────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { sessionId, message } = req.body;
  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  console.log(`\n[/chat] session=${sessionId} → "${message}"`);

  // 1. Load session memory (role, location, experience from prev turns)
  const context = getContext(sessionId);
  console.log(`[/chat] context → role="${context.role}" location="${context.location}" exp="${context.experience}"`);

  // 2. Parse intent — try Gemini first, fall back to local parser
  let parsed = await parseWithGemini(message, context);
  if (!parsed) {
    parsed = parseQuery(message, context);
  }

  console.log(`[/chat] parsed → role="${parsed.role}" location="${parsed.location}" exp="${parsed.experience}" intent="${parsed.intent}"`);

  // 3. Merge: only overwrite context fields if NEW value was found
  //    This is the key fix — "2 yr experience" must NOT erase role
  const role       = parsed.role       || context.role;
  const location   = parsed.location   || context.location;
  const experience = parsed.experience || context.experience;
  const intent     = parsed.intent;

  // 4. Save to session
  updateContext(sessionId, {
    role,
    location,
    experience,
    turn: { role: "user", content: message },
  });

  // 5. Need at least role or location
  if (!role && !location) {
    const reply = formatClarificationReply();
    return res.json({
      reply:   reply.text,
      jobs:    [],
      intent:  parsed,
      context: getContext(sessionId),
    });
  }

  try {
    let response;

    if (intent === "salary") {
      response = formatSalaryReply(role, location, experience);

    } else if (intent === "reviews") {
      response = {
        text: `🏢 Company reviews for **${role}** in **${location}**\n\nCheck:\n- [Glassdoor](https://glassdoor.com)\n- [AmbitionBox](https://ambitionbox.com)`,
        jobs: [],
      };

    } else {
      // Job search — pass experience so scrapers can filter
      if (!role) {
        response = formatErrorReply();
      } else {
        console.log(`[/chat] Scraping → role="${role}" location="${location}" exp="${experience}"`);
        const jobs = await orchestrate(role, location || "India", experience);
        response = formatJobsReply(jobs, role, location || "India", experience);
      }
    }

    // 6. Save reply to history
    updateContext(sessionId, {
      turn: { role: "assistant", content: response.text },
    });

    res.json({
      reply:   response.text,
      jobs:    response.jobs || [],
      intent:  { ...parsed, role, location, experience }, // always return resolved values
      context: getContext(sessionId),
    });

  } catch (err) {
    console.error("[/chat] ERROR:", err.message);
    res.status(500).json({
      error: err.message,
      reply: "⚠️ Something went wrong. Please try again.",
      jobs:  [],
    });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /search-jobs  ← Browser test UI
// ─────────────────────────────────────────────────────────────────────────────
app.get("/search-jobs", async (req, res) => {
  const { role, location, sources, experience } = req.query;
  if (!role || !location) {
    return res.status(400).json({ error: "role and location are required" });
  }

  const sourceList = sources
    ? sources.split(",").map((s) => s.trim().toLowerCase())
    : ["indeed", "linkedin", "naukri"];

  const start = Date.now();
  try {
    const jobs    = await orchestrate(role, location, experience || null, sourceList);
    const elapsed = ((Date.now() - start) / 1000).toFixed(2);
    res.json({
      total: jobs.length,
      elapsed: `${elapsed}s`,
      summary: {
        indeed:   jobs.filter((j) => j.source === "Indeed").length,
        linkedin: jobs.filter((j) => j.source === "LinkedIn").length,
        naukri:   jobs.filter((j) => j.source === "Naukri").length,
      },
      jobs,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /debug-scraper?source=naukri&role=Flutter Developer&location=Chennai
// ─────────────────────────────────────────────────────────────────────────────
app.get("/debug-scraper", async (req, res) => {
  const { source = "naukri", role = "Flutter Developer", location = "Chennai", experience } = req.query;
  try {
    let jobs = [];
    if (source === "naukri") {
      const { scrapeNaukri }   = await import("./services/scrapers/naukri.js");
      jobs = await scrapeNaukri(role, location, experience);
    } else if (source === "indeed") {
      const { scrapeIndeed }   = await import("./services/scrapers/indeed.js");
      jobs = await scrapeIndeed(role, location, experience);
    } else if (source === "linkedin") {
      const { scrapeLinkedIn } = await import("./services/scrapers/linkedin.js");
      jobs = await scrapeLinkedIn(role, location, experience);
    }
    res.json({ source, role, location, experience, count: jobs.length, jobs });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /health
// ─────────────────────────────────────────────────────────────────────────────
app.get("/health", (_req, res) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.listen(3000, "0.0.0.0", () => {
  console.log("✅  Server running  → http://localhost:3000");
  console.log("📱  Flutter /chat   → POST http://192.168.1.17:3000/chat");
  console.log(`🤖  Gemini AI       → ${process.env.GEMINI_API_KEY ? "enabled ✓" : "disabled (add GEMINI_API_KEY to .env)"}`);
});