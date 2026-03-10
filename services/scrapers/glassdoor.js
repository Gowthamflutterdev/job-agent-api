export async function scrapeGlassdoor(page, query, location, mode = "reviews") {
  try {
    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36"
    );

    const searchUrl = `https://www.glassdoor.com/Search/results.htm?keyword=${encodeURIComponent(query)}`;
    await page.goto(searchUrl, { waitUntil: "domcontentloaded", timeout: 60000 });

    await new Promise(r => setTimeout(r, 3000));

    const data = await page.evaluate((mode) => {
      const results = [];
      if (mode === "reviews") {
        document.querySelectorAll("[data-test='employer-card-single']").forEach(card => {
          const name = card.querySelector("[data-test='employer-short-name']")?.innerText;
          const rating = card.querySelector("[data-test='rating-info']")?.innerText;
          const review = card.querySelector("[data-test='review-count']")?.innerText;
          if (name) results.push({ source: "Glassdoor", name, rating, review });
        });
      }
      return results;
    }, mode);

    return data;
  } catch (err) {
    console.log("Glassdoor ERROR:", err.message);
    return [];
  }
}