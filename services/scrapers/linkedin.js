import { newPage } from "../../utils/browserPool.js";

export async function scrapeLinkedIn(role, location) {
  let page;
  try {
    console.log(`[LinkedIn] Scraping: "${role}" in "${location}"`);
    page = await newPage();

    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&f_TPR=r86400`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    // LinkedIn needs a bit of time to render
    await new Promise((r) => setTimeout(r, 3000));

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 2000));

    const jobs = await page.evaluate(() => {
      const results = [];

      // Public LinkedIn job listings (no login required)
      const cards = document.querySelectorAll(
        ".base-card, .jobs-search__results-list li, [data-occludable-job-id]"
      );

      cards.forEach((card) => {
        const title =
          card.querySelector(
            ".base-search-card__title, .job-search-card__title, h3"
          )?.innerText?.trim();

        const company =
          card.querySelector(
            ".base-search-card__subtitle, .job-search-card__company-name, h4"
          )?.innerText?.trim();

        const location =
          card.querySelector(
            ".job-search-card__location, .base-search-card__metadata span"
          )?.innerText?.trim();

        const link = card.querySelector("a.base-card__full-link, a")?.href || null;

        const listed =
          card.querySelector(
            ".job-search-card__listdate, time"
          )?.innerText?.trim() || null;

        if (title) {
          results.push({
            source: "LinkedIn",
            title,
            company: company || "N/A",
            location: location || "N/A",
            salary: null,
            listed,
            link,
          });
        }
      });

      return results;
    });

    console.log(`[LinkedIn] Found ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error("[LinkedIn] ERROR:", error.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
