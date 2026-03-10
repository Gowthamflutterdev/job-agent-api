import { newPage } from "../../utils/browserPool.js";

export async function scrapeNaukri(role, location) {
  let page;
  try {
    console.log(`[Naukri] Scraping: "${role}" in "${location}"`);
    page = await newPage();

    // Naukri URL format: /flutter-developer-jobs-in-chennai
    const roleSlug = role.toLowerCase().replace(/\s+/g, "-");
    const locationSlug = location.toLowerCase().replace(/\s+/g, "-");
    const url = `https://www.naukri.com/${roleSlug}-jobs-in-${locationSlug}`;

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });

    await page
      .waitForSelector(".srp-jobtuple-wrapper, article.jobTuple", { timeout: 20000 })
      .catch(() => console.log("[Naukri] Selector timed out, continuing..."));

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 2500));

    const jobs = await page.evaluate(() => {
      const results = [];

      const cards = document.querySelectorAll(
        ".srp-jobtuple-wrapper, article.jobTuple, .cust-job-tuple"
      );

      cards.forEach((card) => {
        const title =
          card.querySelector(
            "a.title, .title, [class*='jobTupleHeader'] a"
          )?.innerText?.trim();

        const company =
          card.querySelector(
            ".comp-name, [class*='companyInfo'] a, .company"
          )?.innerText?.trim();

        const location =
          card.querySelector(
            ".loc-wrap, .location, [class*='location']"
          )?.innerText?.trim();

        const salary =
          card.querySelector(
            ".sal-wrap, .salary, [class*='salary']"
          )?.innerText?.trim() || null;

        const experience =
          card.querySelector(
            ".exp-wrap, .experience, [class*='experience']"
          )?.innerText?.trim() || null;

        const link =
          card.querySelector("a.title, a[class*='jobTupleHeader']")?.href || null;

        const posted =
          card.querySelector(".job-post-day, .freshness")?.innerText?.trim() || null;

        if (title) {
          results.push({
            source: "Naukri",
            title,
            company: company || "N/A",
            location: location || "N/A",
            salary,
            experience,
            posted,
            link,
          });
        }
      });

      return results;
    });

    console.log(`[Naukri] Found ${jobs.length} jobs`);
    return jobs;
  } catch (error) {
    console.error("[Naukri] ERROR:", error.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}
