const axios = require("axios");

async function searchRemoteOK(keyword) {

  try {

    const response = await axios.get("https://remoteok.com/api");

    const jobs = response.data
      .filter(job =>
        job.position?.toLowerCase().includes(keyword.toLowerCase())
      )
      .map(job => ({
        title: job.position,
        company: job.company,
        location: job.location || "Remote",
        url: job.url,
        source: "RemoteOK"
      }));

    return jobs;

  } catch (error) {

    console.log("RemoteOK failed");
    return [];

  }

}

module.exports = searchRemoteOK;