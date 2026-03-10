import { newPage } from "../../utils/browserPool.js";

export async function scrapeLinkedIn(role, location, experience = null) {
  let page;
  try {
    console.log(`[LinkedIn] role="${role}" location="${location}" exp="${experience}"`);
    page = await newPage();

    // f_E = experience level filter: 1=Internship, 2=Entry, 3=Associate, 4=Mid-Senior, 5=Director
    let expFilter = "";
    if (experience === "Fresher") expFilter = "&f_E=1,2";
    else if (experience) {
      const yrs = parseInt(experience);
      if (yrs <= 2)      expFilter = "&f_E=2";
      else if (yrs <= 5) expFilter = "&f_E=3,4";
      else               expFilter = "&f_E=4,5";
    }

    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(role)}&location=${encodeURIComponent(location)}&f_TPR=r604800${expFilter}`;
    console.log(`[LinkedIn] URL: ${url}`);

    await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
    await page.waitForSelector(
      '.jobs-search__results-list, .base-card',
      { timeout: 20000 }
    ).catch(() => {});

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await new Promise((r) => setTimeout(r, 3000));

    const locationFilter = (location || "india").toLowerCase();

    const jobs = await page.evaluate((locationFilter) => {
      const results = [];
      const selectors = [
        '.jobs-search__results-list > li',
        'ul.jobs-search__results-list li',
        '.base-card',
      ];

      let cards = [];
      for (const sel of selectors) {
        cards = [...document.querySelectorAll(sel)];
        if (cards.length > 0) break;
      }

      cards.forEach((card) => {
        const title =
          card.querySelector('.base-search-card__title, h3.base-search-card__title')
            ?.innerText?.trim();

        const company =
          card.querySelector('.base-search-card__subtitle, h4')?.innerText?.trim();

        const jobLocation =
          card.querySelector('.job-search-card__location')?.innerText?.trim();

        const link =
          card.querySelector('a.base-card__full-link, a[href*="linkedin.com/jobs/view"]')?.href || null;

        if (!title) return;

        // ── LOCATION FILTER ──────────────────────────────────────
        const locLower = (jobLocation || "").toLowerCase();
        if (jobLocation && locationFilter !== "india" && locationFilter !== "remote") {
          const matches =
            locLower.includes(locationFilter) ||
            locLower.includes("remote") ||
            locLower.includes("anywhere");
          if (!matches) return;
        }

        results.push({
          source:   "LinkedIn",
          title,
          company:  company    || "N/A",
          location: jobLocation || locationFilter,
          link,
        });
      });

      return results;
    }, locationFilter);

    console.log(`[LinkedIn] Found ${jobs.length} jobs`);
    return jobs;

  } catch (err) {
    console.error("[LinkedIn] ERROR:", err.message);
    return [];
  } finally {
    if (page) await page.close().catch(() => {});
  }
}