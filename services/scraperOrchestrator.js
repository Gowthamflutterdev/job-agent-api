import { scrapeIndeed   } from "./scrapers/indeed.js";
import { scrapeLinkedIn } from "./scrapers/linkedin.js";
import { scrapeNaukri   } from "./scrapers/naukri.js";

export async function orchestrate(role, location, experience = null, sources = ["indeed", "linkedin", "naukri"]) {
  // Null safety — never pass null into scrapers
  const safeRole     = (role     || "Developer").trim();
  const safeLocation = (location || "India").trim();

  console.log(`[Orchestrator] role="${safeRole}" location="${safeLocation}" exp="${experience}"`);

  const tasks = [];
  if (sources.includes("indeed"))   tasks.push(scrapeIndeed(safeRole, safeLocation, experience));
  if (sources.includes("linkedin")) tasks.push(scrapeLinkedIn(safeRole, safeLocation, experience));
  if (sources.includes("naukri"))   tasks.push(scrapeNaukri(safeRole, safeLocation, experience));

  const results = await Promise.allSettled(tasks);

  let allJobs = [];
  results.forEach((r) => {
    if (r.status === "fulfilled") allJobs = allJobs.concat(r.value);
    else console.error("[Orchestrator] scraper failed:", r.reason?.message);
  });

  // Deduplicate by title+company
  const seen = new Set();
  allJobs = allJobs.filter((job) => {
    const key = `${(job.title||"").toLowerCase()}|${(job.company||"").toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return allJobs;
}