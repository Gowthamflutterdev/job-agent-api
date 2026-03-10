import OpenAI from "openai"; // or use Google Generative AI SDK

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const INTENT_SYSTEM_PROMPT = `
You are an AI that extracts structured job search intent from user messages.
Return ONLY valid JSON with these fields:
{
  "intent": "job_search" | "salary_info" | "company_reviews" | "general_question",
  "role": string | null,
  "location": string | null,
  "experience": string | null,
  "salary": string | null,
  "company": string | null,
  "clarification_needed": boolean
}
Use conversation history to fill in missing fields from context.
`;

export async function parseIntent(userMessage, history) {
  const messages = [
    { role: "system", content: INTENT_SYSTEM_PROMPT },
    ...history.slice(-6), // last 3 turns for context
    { role: "user", content: userMessage },
  ];

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages,
    response_format: { type: "json_object" },
  });

  return JSON.parse(response.choices[0].message.content);
}

export async function generateChatResponse(userMessage, intent, scrapedData, history) {
  const dataContext = JSON.stringify(scrapedData, null, 2).slice(0, 3000); // limit tokens

  const systemPrompt = `
You are a helpful job search assistant like Perplexity AI.
Given scraped job data, respond conversationally.
- For job searches: summarize top results with company, title, location, and link
- For salary queries: give a range with sources
- For company reviews: summarize ratings and sentiment
- Always cite your sources like [Indeed], [LinkedIn], [Glassdoor]
- Be concise, friendly, and structured with markdown
`;

  const response = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      ...history.slice(-6),
      { role: "user", content: `User asked: "${userMessage}"\n\nScraped data:\n${dataContext}` },
    ],
  });

  return { text: response.choices[0].message.content };
}