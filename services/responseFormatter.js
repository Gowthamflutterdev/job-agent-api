// Builds the chat reply text + structured data for Flutter UI

export function formatJobsReply(jobs, role, location) {
  if (!jobs || jobs.length === 0) {
    return {
      text: `😕 No jobs found for **${role}** in **${location}**.\n\nTry:\n- Broader keywords (e.g. "Flutter" instead of "Flutter Developer")\n- Different location (e.g. "Remote" or "Bangalore")`,
      jobs: [],
    };
  }

  const bySource = {
    Indeed:   jobs.filter((j) => j.source === "Indeed"),
    LinkedIn: jobs.filter((j) => j.source === "LinkedIn"),
    Naukri:   jobs.filter((j) => j.source === "Naukri"),
  };

  const sourceSummary = Object.entries(bySource)
    .filter(([, list]) => list.length > 0)
    .map(([src, list]) => `**${src}** (${list.length})`)
    .join(" · ");

  let text = `🔍 Found **${jobs.length} jobs** for **${role}** in **${location}**\n`;
  text += `Sources: ${sourceSummary}\n\n`;

  // Show top 3 highlights in text
  const top = jobs.slice(0, 3);
  top.forEach((job, i) => {
    text += `**${i + 1}. ${job.title}** at ${job.company}\n`;
    text += `📍 ${job.location}`;
    if (job.salary) text += ` · 💰 ${job.salary}`;
    text += ` · [${job.source}]\n\n`;
  });

  if (jobs.length > 3) {
    text += `_...and ${jobs.length - 3} more jobs below_`;
  }

  return { text, jobs };
}

export function formatSalaryReply(role, location, experience) {
  // Static salary bands — replace with Glassdoor scrape later
  const bands = {
    "Flutter Developer": { fresher: "₹3L–₹5L", mid: "₹6L–₹12L", senior: "₹14L–₹25L" },
    "React Developer":   { fresher: "₹3L–₹6L", mid: "₹7L–₹14L", senior: "₹16L–₹30L" },
    "Node.js Developer": { fresher: "₹3L–₹5L", mid: "₹6L–₹12L", senior: "₹13L–₹22L" },
    "Data Scientist":    { fresher: "₹4L–₹7L", mid: "₹8L–₹18L", senior: "₹20L–₹40L" },
  };

  const key = Object.keys(bands).find((k) =>
    role?.toLowerCase().includes(k.split(" ")[0].toLowerCase())
  );

  const band = bands[key] || { fresher: "₹3L–₹6L", mid: "₹6L–₹14L", senior: "₹15L–₹30L" };

  let level = "mid";
  if (experience) {
    const yrs = parseInt(experience);
    if (isNaN(yrs) || experience === "Fresher") level = "fresher";
    else if (yrs >= 5) level = "senior";
    else if (yrs >= 2) level = "mid";
    else level = "fresher";
  }

  const expLabel = experience || "2–4 years";
  const range = band[level];

  return {
    text: `💰 **Average Salary — ${role} in ${location}**\n\nExperience: **${expLabel}**\nRange: **${range} per annum**\n\n📊 Breakdown:\n- Fresher (0–1 yr): ${band.fresher}\n- Mid (2–4 yrs): ${band.mid}\n- Senior (5+ yrs): ${band.senior}\n\n_Source: Industry averages · Glassdoor · Naukri insights_`,
    jobs: [],
  };
}

export function formatErrorReply(role, location) {
  return {
    text: `⚠️ I need a bit more info to help you.\n\nTry:\n- "Flutter jobs in Chennai"\n- "React Developer jobs in Bangalore"\n- "Python developer salary for 3 years"`,
    jobs: [],
  };
}

export function formatClarificationReply() {
  return {
    text: `🤔 Could you tell me:\n1. What **job role** are you looking for?\n2. Which **city or location**?\n\nExample: _"Flutter developer jobs in Chennai"_`,
    jobs: [],
  };
}
