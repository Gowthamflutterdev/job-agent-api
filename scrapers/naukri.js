const axios = require("axios");
const cheerio = require("cheerio");

async function searchNaukri(keyword){

 const url = `https://www.naukri.com/${keyword}-jobs`;

 const response = await axios.get(url);

 const $ = cheerio.load(response.data);

 let jobs = [];

 $(".title").each((i, el)=>{

   jobs.push({
     title: $(el).text().trim(),
     source: "Naukri"
   });

 });

 return jobs;

}

module.exports = searchNaukri;