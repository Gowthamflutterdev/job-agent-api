import { newPage } from "../../utils/browserPool.js";

export async function scrapeIndeed(role, location, experience = null) {
  let page;
  try {
    console.log(`[Indeed] role="${role}" location="${location}" exp="${experience}"`);
    page = await newPage();

    let query = role;
    if (experience && experience !== "Fresher") query += ` ${experience} experience`;
    if (experience === "Fresher") query += " fresher";

    const url = `https://in.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`;
    console.log(`[Indeed] URL: ${url}`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    const title = await page.title();
    console.log(`[Indeed] Page title: "${title}"`);
    if (title.toLowerCase().includes("robot") || title.toLowerCase().includes("captcha")) {
      console.log("[Indeed] Bot detected — skipping");
      return [];
    }

    await page.waitForSelector(
      '#mosaic-provider-jobcards, [data-testid="jobsearch-ResultsList"], .job_seen_beacon',
      { timeout: 20000 }
    ).catch(() => {});

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 2000));

    const locationFilter = (location || "india").toLowerCase();

    const jobs = await page.evaluate((locationFilter) => {
      const results = [];
      const selectors = ['.job_seen_beacon', '[data-testid="job-card"]', '[data-jk]'];
      let cards = [];
      for (const sel of selectors) {
        cards = [...document.querySelectorAll(sel)];
        if (cards.length > 0) break;
      }

      cards.forEach((card) => {
        const titleEl =
          card.querySelector('[data-testid="jobTitle"] a') ||
          card.querySelector('[data-testid="jobTitle"]') ||
          card.querySelector('h2 a span') ||
          card.querySelector('h2 a');
        const title = titleEl?.innerText?.trim();

        const company =
          (card.querySelector('[data-testid="company-name"]') ||
           card.querySelector('.companyName'))?.innerText?.trim();

        const jobLocation =
          (card.querySelector('[data-testid="text-location"]') ||
           card.querySelector('.companyLocation'))?.innerText?.trim();

        const salary =
          (card.querySelector('[data-testid="attribute_snippet_testid"]') ||
           card.querySelector('.salary-snippet-container'))?.innerText?.trim() || null;

        const href = (card.querySelector('h2 a') || card.querySelector('a[data-jk]'))?.getAttribute("href") || "";
        const link = href.startsWith("http") ? href : `https://in.indeed.com${href}`;

        if (!title) return;

        // ── LOCATION FILTER ──────────────────────────────────────
        const locLower = (jobLocation || "").toLowerCase();
        if (jobLocation && locationFilter !== "india" && locationFilter !== "remote") {
          const matches =
            locLower.includes(locationFilter) ||
            locLower.includes("remote") ||
            locLower.includes("work from home") ||
            locLower.includes("hybrid");
          if (!matches) return;
        }

        results.push({
          source:   "Indeed",
          title,
          company:  company    || "N/A",
          location: jobLocation || locationFilter,
          salary,
          link,
        });
      });

      return results;
    }, locationFilter);

    console.log(`[Indeed] Found ${jobs.length} jobs`);
    return jobs;

  } catch (err) {
    console.error("[Indeed] ERROR:", err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}