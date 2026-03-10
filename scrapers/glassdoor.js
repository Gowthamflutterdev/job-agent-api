const axios = require("axios");
const cheerio = require("cheerio");

async function searchGlassdoor(keyword){

 const url = `https://www.glassdoor.com/Job/jobs.htm?sc.keyword=${keyword}`;

 const response = await axios.get(url);

 const $ = cheerio.load(response.data);

 let jobs = [];

 $(".jobLink").each((i, el)=>{

   jobs.push({
     title: $(el).text().trim(),
     source: "Glassdoor"
   });

 });

 return jobs;

}

module.exports = searchGlassdoor;