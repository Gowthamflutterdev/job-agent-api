const searchIndeed = require("../scrapers/indeed");
const searchLinkedIn = require("../scrapers/linkedin");
const searchNaukri = require("../scrapers/naukri");

async function searchAllJobs(query, location) {

  const indeedJobs = await searchIndeed(query, location);
  const linkedinJobs = await searchLinkedIn(query, location);
  const naukriJobs = await searchNaukri(query, location);

  return [
    ...indeedJobs,
    ...linkedinJobs,
    ...naukriJobs
  ];
}

module.exports = searchAllJobs;