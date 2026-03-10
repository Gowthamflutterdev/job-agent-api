const axios = require("axios");
const cheerio = require("cheerio");

async function searchLinkedIn(keyword){

 const url = `https://www.linkedin.com/jobs/search?keywords=${keyword}`;

 const response = await axios.get(url);

 const $ = cheerio.load(response.data);

 let jobs = [];

 $(".base-search-card__title").each((i, el)=>{

   jobs.push({
     title: $(el).text().trim(),
     source: "LinkedIn"
   });

 });

 return jobs;

}

module.exports = searchLinkedIn;