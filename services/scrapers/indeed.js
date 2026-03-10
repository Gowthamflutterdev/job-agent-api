import { newPage } from "../../utils/browserPool.js";

export async function scrapeIndeed(role, location) {
  let page;
  try {
    console.log(`[Indeed] Scraping: "${role}" in "${location}"`);
    page = await newPage();

    const url = `https://www.indeed.com/jobs?q=${encodeURIComponent(role)}&l=${encodeURIComponent(location)}`;
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // Wait for job cards to appear
    await page.waitForSelector("#mosaic-provider-jobcards", { timeout: 20000 }).catch(() => {
      console.log("[Indeed] Job cards selector timed out, trying fallback...");
    });

    // Scroll to trigger lazy load
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 2000));

    const jobs = await page.evaluate(() => {
      const results = [];

      const cards = document.querySelectorAll(
        ".job_seen_beacon, .jobsearch-SerpJobCard, [data-testid='job-card']"
      );

      cards.forEach((card) => {
        const title =
          card.querySelector("h2 a span[title], h2 a span, [data-testid='jobTitle'] span")
            ?.innerText?.trim();

        const company =
          card.querySelector(
            "[data-testid='company-name'], .companyName, .css-63koeb"
          )?.innerText?.trim();

        const location =
          card.querySelector(
            "[data-testid='text-location'], .companyLocation, .css-1p0sjhy"
          )?.innerText?.trim();

        const salary =
          card.querySelector(
            "[data-testid='attribute_snippet_testid'], .salary-snippet, .estimated-salary"
          )?.innerText?.trim() || null;

        const linkEl = card.querySelector("h2 a");
        const link = linkEl
          ? "https://www.indeed.com" + (linkEl.getAttribute("href") || "")
          : null;

        if (title) {
          results.push({
            source: "Indeed",
            title,
            company: company || "N/A",
            location: location || "N/A",
            salary,
            link,
          });
        }
      });

      return results;
    });

    console.log(`[Indeed] Found ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error("[Indeed] ERROR:", error.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
