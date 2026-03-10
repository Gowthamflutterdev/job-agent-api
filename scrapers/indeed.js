const puppeteer = require("puppeteer");

async function searchIndeed(query, location) {

  const browser = await puppeteer.launch({

    headless: true,

    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",

    args: ["--no-sandbox", "--disable-setuid-sandbox"]

  });

  const page = await browser.newPage();

  const url = `https://www.indeed.com/jobs?q=${query}&l=${location}`;

  await page.goto(url, { waitUntil: "networkidle2" });

  const jobs = await page.evaluate(() => {

    const jobCards = document.querySelectorAll(".job_seen_beacon");

    const results = [];

    jobCards.forEach(job => {

      const title = job.querySelector("h2 span")?.innerText;
      const company = job.querySelector(".companyName")?.innerText;
      const location = job.querySelector(".companyLocation")?.innerText;

      results.push({
        title,
        company,
        location,
        source: "Indeed"
      });

    });

    return results;

  });

  await browser.close();

  return jobs;
}

module.exports = searchIndeed;