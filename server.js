import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { orchestrate } from "./services/scraperOrchestrator.js";
import { parseQuery } from "./services/queryParser.js";
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
// POST /chat  ← Flutter calls this
// Body:     { "sessionId": "abc123", "message": "flutter jobs in chennai" }
// Response: { "reply": "...", "jobs": [...], "intent": {}, "context": {} }
// ─────────────────────────────────────────────────────────────────────────────
app.post("/chat", async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message are required" });
  }

  console.log(`\n[/chat] session=${sessionId} → "${message}"`);

  // 1. Load remembered role+location from earlier turns
  const context = getContext(sessionId);

  // 2. Parse the message (intent + entities)
  const parsed = parseQuery(message, context);
  console.log(`[/chat] parsed →`, parsed);

  const { intent, role, location, experience } = parsed;

  // 3. Persist extracted fields into session
  updateContext(sessionId, {
    role,
    location,
    turn: { role: "user", content: message },
  });

  // 4. Need at least role or location
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
      // job_search (default)
      if (!role) {
        response = formatErrorReply();
      } else {
        console.log(`[/chat] Scraping → role="${role}" location="${location}"`);
        const jobs = await orchestrate(role, location || "India");
        response = formatJobsReply(jobs, role, location || "India");
      }
    }

    // 5. Save assistant reply to history
    updateContext(sessionId, {
      turn: { role: "assistant", content: response.text },
    });

    // 6. Send to Flutter
    res.json({
      reply:   response.text,
      jobs:    response.jobs || [],
      intent:  parsed,
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
// Query: ?role=Flutter Developer&location=Chennai&sources=indeed,linkedin,naukri
// ─────────────────────────────────────────────────────────────────────────────
app.get("/search-jobs", async (req, res) => {
  const { role, location, sources } = req.query;

  if (!role || !location) {
    return res.status(400).json({ error: "role and location are required" });
  }

  const sourceList = sources
    ? sources.split(",").map((s) => s.trim().toLowerCase())
    : ["indeed", "linkedin", "naukri"];

  const startTime = Date.now();
  console.log(`\n[/search-jobs] role="${role}" location="${location}" sources=${sourceList.join(",")}`);

  try {
    const jobs    = await orchestrate(role, location, sourceList);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

    res.json({
      total:   jobs.length,
      elapsed: `${elapsed}s`,
      summary: {
        indeed:   jobs.filter((j) => j.source === "Indeed").length,
        linkedin: jobs.filter((j) => j.source === "LinkedIn").length,
        naukri:   jobs.filter((j) => j.source === "Naukri").length,
      },
      jobs,
    });
  } catch (err) {
    console.error("[/search-jobs] ERROR:", err.message);
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
  console.log("🧪  Browser test UI → http://localhost:3000");
});
