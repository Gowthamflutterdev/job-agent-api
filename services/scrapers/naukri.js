import { newPage } from "../../utils/browserPool.js";

export async function scrapeNaukri(role, location, experience = null) {
  let page;
  try {
    console.log(`[Naukri] role="${role}" location="${location}" exp="${experience}"`);
    page = await newPage();

    const roleSlug     = role.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
    const locationSlug = location.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    // Build URL — add experience filter if provided
    let url = `https://www.naukri.com/${roleSlug}-jobs-in-${locationSlug}`;
    if (experience && experience !== "Fresher") {
      const yrs = parseInt(experience);
      if (!isNaN(yrs)) url += `?experience=${yrs}`;
    } else if (experience === "Fresher") {
      url += "?experience=0";
    }

    console.log(`[Naukri] URL: ${url}`);
    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });

    await page.waitForSelector(
      '[class*="srp-jobtuple"], [class*="jobTuple"], .cust-job-tuple, [data-job-id]',
      { timeout: 25000 }
    ).catch(() => console.log("[Naukri] selector timed out"));

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 2000));

    const locationFilter = (location || "india").toLowerCase();

    const jobs = await page.evaluate((locationFilter) => {
      const results = [];
      const selectors = [
        '[class*="srp-jobtuple-wrapper"]',
        '[class*="jobTuple"]',
        '.cust-job-tuple',
        'article[data-job-id]',
      ];

      let cards = [];
      for (const sel of selectors) {
        cards = [...document.querySelectorAll(sel)];
        if (cards.length > 0) break;
      }

      cards.forEach((card) => {
        const titleEl =
          card.querySelector('a[class*="title"]') ||
          card.querySelector('.title') ||
          card.querySelector('a[title]');
        const title = titleEl?.innerText?.trim() || titleEl?.getAttribute("title");

        const company =
          (card.querySelector('[class*="comp-name"]') ||
           card.querySelector('[class*="companyInfo"] a'))?.innerText?.trim();

        const jobLocation =
          (card.querySelector('[class*="loc-wrap"]') ||
           card.querySelector('[class*="location"]') ||
           card.querySelector('li[class*="location"]'))?.innerText?.trim();

        const salary =
          card.querySelector('[class*="sal-wrap"]')?.innerText?.trim() || null;

        const experience =
          card.querySelector('[class*="exp-wrap"]')?.innerText?.trim() || null;

        const link = titleEl?.href || null;

        if (!title) return;

        // ── LOCATION FILTER: skip jobs from other cities ─────────
        // Only skip if location info exists AND clearly doesn't match
        const locLower = (jobLocation || "").toLowerCase();
        if (jobLocation && locationFilter !== "india" && locationFilter !== "remote") {
          const matches =
            locLower.includes(locationFilter) ||
            locLower.includes("remote") ||
            locLower.includes("work from home") ||
            locLower.includes("hybrid");
          if (!matches) return; // skip abroad/other city jobs
        }

        results.push({
          source:     "Naukri",
          title,
          company:    company    || "N/A",
          location:   jobLocation || location,
          salary,
          experience,
          link,
        });
      });

      return results;
    }, locationFilter);

    console.log(`[Naukri] Found ${jobs.length} jobs`);
    return jobs;

  } catch (err) {
    console.error("[Naukri] ERROR:", err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}