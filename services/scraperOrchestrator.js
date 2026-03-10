import { scrapeIndeed } from "./scrapers/indeed.js";
import { scrapeLinkedIn } from "./scrapers/linkedin.js";
import { scrapeNaukri } from "./scrapers/naukri.js";

export async function orchestrate(role, location, sources = ["indeed", "linkedin", "naukri"]) {
  const tasks = [];

  if (sources.includes("indeed"))   tasks.push(scrapeIndeed(role, location));
  if (sources.includes("linkedin")) tasks.push(scrapeLinkedIn(role, location));
  if (sources.includes("naukri"))   tasks.push(scrapeNaukri(role, location));

  const results = await Promise.allSettled(tasks);

  let allJobs = [];
  results.forEach((result) => {
    if (result.status === "fulfilled") {
      allJobs = allJobs.concat(result.value);
    } else {
      console.error("[Orchestrator] Scraper failed:", result.reason?.message);
    }
  });

  return allJobs;
}
