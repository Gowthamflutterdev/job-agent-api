const GEMINI_API_KEY = process.env.GEMINI_API_KEY || null;
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

const SYSTEM_PROMPT = `You are a job search assistant. Extract structured data from the user message.
Return ONLY valid JSON, no markdown, no backticks, no explanation:
{"intent":"jobs","role":null,"location":null,"experience":null}

Rules:
- intent: "jobs" | "salary" | "reviews"
- If message is only a filter like "2 years experience" or "remote" — set role and location to null (use context values)
- experience format: "2 years" | "Fresher" | null`;

export async function parseWithGemini(message, context = {}) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === "your_gemini_key_here") return null;

  try {
    const prompt = `Context: role="${context.role||"none"}", location="${context.location||"none"}"
User: "${message}"
Return JSON only:`;

    const res = await fetch(`${GEMINI_URL}?key=${GEMINI_API_KEY}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: `${SYSTEM_PROMPT}\n\n${prompt}` }] }],
        generationConfig: { temperature: 0, maxOutputTokens: 150 },
      }),
    });

    if (!res.ok) {
      console.log(`[Gemini] HTTP ${res.status} — skipping`);
      return null;
    }

    const data = await res.json();
    const raw  = data.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!raw.trim()) {
      console.log("[Gemini] Empty response — skipping");
      return null;
    }

    // Strip any accidental markdown fences
    const clean = raw.replace(/```json|```/g, "").trim();

    // Find the JSON object even if there's surrounding text
    const jsonMatch = clean.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.log("[Gemini] No JSON found in response:", raw);
      return null;
    }

    const parsed = JSON.parse(jsonMatch[0]);
    console.log("[Gemini] parsed →", parsed);
    return parsed;

  } catch (err) {
    console.log("[Gemini] Failed, using local parser:", err.message);
    return null;
  }
}