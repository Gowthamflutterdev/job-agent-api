// server.js

import express from "express"
import cors from "cors"
import puppeteer from "puppeteer"

const app = express()
app.use(cors())

const PORT = 3000

async function launchBrowser() {
  return puppeteer.launch({
    headless: true,
    executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    protocolTimeout: 120000,
    args: ["--no-sandbox", "--disable-setuid-sandbox"]
  })
}

async function searchIndeed(page, query, location) {
  try {
    console.log("---- Indeed Scraper START ----")

    const url =
      `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}&l=${encodeURIComponent(location)}`

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36"
    )

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })

    // wait for job container
    await page.waitForSelector("#mosaic-provider-jobcards", { timeout: 20000 })

    // scroll to load jobs
    await page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight)
    })

    await new Promise(r => setTimeout(r, 2000))

    const jobs = await page.evaluate(() => {

      const results = []

      const cards = document.querySelectorAll(
        ".job_seen_beacon, .jobsearch-SerpJobCard"
      )

      cards.forEach(card => {

        const title =
          card.querySelector("h2 a span")?.innerText?.trim()

        const company =
          card.querySelector(".companyName")?.innerText?.trim()

        const location =
          card.querySelector(".companyLocation")?.innerText?.trim()

        const link =
          card.querySelector("h2 a")?.href

        if (title) {
          results.push({
            source: "Indeed",
            title,
            company,
            location,
            link
          })
        }

      })

      return results
    })

    console.log("Indeed jobs scraped:", jobs.length)

    return jobs

  } catch (error) {

    console.log("Indeed ERROR:", error.message)

    return []
  }
}

async function searchLinkedIn(page, query, location) {

  const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(query)}&location=${encodeURIComponent(location)}`

  await page.goto(url, { waitUntil: "domcontentloaded" })

  return page.evaluate(() => {

    const jobs = []

    document.querySelectorAll(".base-card").forEach(job => {

      const title = job.querySelector(".base-search-card__title")?.innerText
      const company = job.querySelector(".base-search-card__subtitle")?.innerText
      const location = job.querySelector(".job-search-card__location")?.innerText
      const link = job.querySelector("a")?.href

      if (title) {
        jobs.push({
          source: "LinkedIn",
          title,
          company,
          location,
          link
        })
      }

    })

    return jobs
  })
}

async function searchNaukri(page, query, location) {

  try {

    console.log("---- Naukri Scraper START ----")

    const url =
      `https://www.naukri.com/${encodeURIComponent(query)}-jobs-in-${encodeURIComponent(location)}`

    await page.setUserAgent(
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36"
    )

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: 60000
    })

    await page.waitForSelector(".srp-jobtuple-wrapper", { timeout: 20000 })

    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))

    await new Promise(r => setTimeout(r, 2000))

    const jobs = await page.evaluate(() => {

      const results = []

      const cards =
        document.querySelectorAll(".srp-jobtuple-wrapper")

      cards.forEach(card => {

        const title =
          card.querySelector(".title")?.innerText?.trim()

        const company =
          card.querySelector(".comp-name")?.innerText?.trim()

        const location =
          card.querySelector(".loc-wrap")?.innerText?.trim()

        const link =
          card.querySelector("a.title")?.href

        if (title) {

          results.push({
            source: "Naukri",
            title,
            company,
            location,
            link
          })

        }

      })

      return results

    })

    console.log("Naukri jobs scraped:", jobs.length)

    return jobs

  } catch (error) {

    console.log("Naukri ERROR:", error.message)

    return []

  }

}
app.get("/search-jobs", async (req, res) => {

  const { query, location } = req.query

  if (!query || !location) {
    return res.json({ error: "query and location required" })
  }

  try {

    const browser = await launchBrowser()

    const indeedPage = await browser.newPage()
    const linkedinPage = await browser.newPage()
    const naukriPage = await browser.newPage()

    const [indeed, linkedin, naukri] =
      await Promise.all([
        searchIndeed(indeedPage, query, location),
        searchLinkedIn(linkedinPage, query, location),
        searchNaukri(naukriPage, query, location)
      ])

    await browser.close()

    const jobs = [...indeed, ...linkedin, ...naukri]

    res.json({
      total: jobs.length,
      jobs
    })

  } catch (error) {

    res.json({
      error: error.message
    })

  }

})

app.listen(3000, "0.0.0.0", () => {
  console.log("Server running on port 3000");
});