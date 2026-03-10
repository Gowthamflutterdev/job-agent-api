function mergeResults(jobs){

    const unique = [];
   
    const titles = new Set();
   
    jobs.forEach(job => {
   
      if(!titles.has(job.title)){
   
        titles.add(job.title);
        unique.push(job);
   
      }
   
    });
   
    return unique;
   
   }
   
   module.exports = mergeResults;