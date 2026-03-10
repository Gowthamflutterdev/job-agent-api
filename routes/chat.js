import express from "express";
import { parseIntent, generateChatResponse } from "../services/llmService.js";
import { getContext, updateContext } from "../services/contextManager.js";
import { orchestrate } from "../services/scraperOrchestrator.js";

const router = express.Router();

router.post("/", async (req, res) => {
  const { sessionId, message } = req.body;

  if (!sessionId || !message) {
    return res.status(400).json({ error: "sessionId and message required" });
  }

  try {
    // 1. Get conversation history
    const history = getContext(sessionId);

    // 2. LLM parses intent using history + new messagee
    const intent = await parseIntent(message, history);
    console.log("Parsed intent:", intent);
    

    // 3. Run scrapers based on intent
    const scrapedData = await orchestrate(intent);

    // 4. LLM generates a natural language response
    const reply = await generateChatResponse(message, intent, scrapedData, history);

    // 5. Update context
    updateContext(sessionId, { role: "user", content: message });
    updateContext(sessionId, { role: "assistant", content: reply.text });

    res.json({
      reply: reply.text,
      intent,
      data: scrapedData,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;