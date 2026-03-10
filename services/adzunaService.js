const axios = require("axios");

const APP_ID = "4c9b01a1";
const API_KEY = "152f0079e4c3538daa66c8d7a7ee8086";

async function searchAdzuna(keyword, location) {

  try {

    const url = `https://api.adzuna.com/v1/api/jobs/in/search/1?app_id=${APP_ID}&app_key=${API_KEY}&what=${keyword}&where=${location}`;

    const response = await axios.get(url);

    const jobs = response.data.results.map(job => ({
      title: job.title,
      company: job.company.display_name,
      location: job.location.display_name,
      url: job.redirect_url,
      source: "Adzuna"
    }));

    return jobs;

  } catch (error) {

    console.log("Adzuna failed");
    return [];

  }

}

module.exports = searchAdzuna;