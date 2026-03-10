// const express = require("express");
// const router = express.Router();
// const searchIndeed = require("../scrapers/indeed");

// router.get("/", async (req, res) => {

//   const keyword = req.query.q || "flutter";

//   try {
//     const indeedJobs = await searchIndeed(keyword);

//     res.json({
//       success: true,
//       jobs: indeedJobs
//     });

//   } catch (error) {

//     console.log("Jobs route error:", error.message);

//     res.json({
//       success: false,
//       jobs: []
//     });
//   }

// });

// module.exports = router;


/// for adzuno global search 
// const express = require("express");
// const router = express.Router();

// const searchAdzuna = require("../services/adzunaService");
// const searchRemoteOK = require("../services/remoteOkService");

// router.get("/", async (req, res) => {

//   const query = req.query.q || "flutter developer";
//   const location = req.query.location || "india";

//   try {

//     const adzunaJobs = await searchAdzuna(query, location);
//     const remoteJobs = await searchRemoteOK(query);

//     const jobs = [...adzunaJobs, ...remoteJobs];

//     res.json({
//       success: true,
//       count: jobs.length,
//       jobs: jobs
//     });

//   } catch (error) {

//     console.error(error);

//     res.status(500).json({
//       success: false,
//       jobs: []
//     });

//   }

// });

// module.exports = router;


const express = require("express");
const router = express.Router();
const searchAllJobs = require("../services/jobAggregator");

router.get("/", async (req, res) => {

  const query = req.query.q;
  const location = req.query.location;

  const jobs = await searchAllJobs(query, location);

  res.json({
    success: true,
    jobs: jobs
  });

});

module.exports = router;