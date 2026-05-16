const fs = require("fs");
const path = require("path");

const defaultCollectionPath = path.resolve(
  __dirname,
  "../other/StartupConnect Backend API.postman_collection.json"
);
const p = process.argv[2] ? path.resolve(process.argv[2]) : defaultCollectionPath;

if (!fs.existsSync(p)) {
  console.error(
    JSON.stringify(
      {
        error: "Postman collection file not found",
        attemptedPath: p,
        hint: "Pass an explicit path: node support/scripts/check_postman_collection.js <collection.json>",
      },
      null,
      2
    )
  );
  process.exit(1);
}

const col = JSON.parse(fs.readFileSync(p, "utf8"));
const items = [];

function normalizeUrl(rawUrl) {
  const value = String(rawUrl || "").trim();
  if (!value) return value;
  if (value.startsWith("http://localhost:3000")) {
    return value.replace("http://localhost:3000", "{{baseUrl}}");
  }
  if (value.startsWith("https://localhost:3000")) {
    return value.replace("https://localhost:3000", "{{baseUrl}}");
  }
  return value;
}

function walk(arr) {
  arr.forEach((item) => {
    if (item.request) {
      const method = item.request.method || "";
      const reqUrl = item.request.url;
      const url =
        (typeof reqUrl === "string" && reqUrl) ||
        (reqUrl && (reqUrl.raw || (reqUrl.path && "/" + reqUrl.path.join("/")) || "")) ||
        "";
      const bodyMode = (item.request.body && item.request.body.mode) || "";
      items.push({
        name: item.name,
        method,
        url,
        normalizedUrl: normalizeUrl(url),
        bodyMode,
      });
    }
    if (item.item) walk(item.item);
  });
}

walk(col.item);

const checks = [
  {
    name: "Auth register",
    method: "POST",
    raw: "{{baseUrl}}/api/auth/register",
  },
  { name: "Auth login", method: "POST", raw: "{{baseUrl}}/api/auth/login" },
  { name: "Auth refresh", method: "POST", raw: "{{baseUrl}}/api/auth/refresh" },
  { name: "Auth logout", method: "POST", raw: "{{baseUrl}}/api/auth/logout" },
  {
    name: "Auth approve",
    method: "PUT",
    raw: "{{baseUrl}}/api/auth/approve/{{userId}}",
  },
  {
    name: "Startup profile",
    method: "POST",
    raw: "{{baseUrl}}/api/startups/profile",
  },
  {
    name: "Mentor profile create",
    method: "POST",
    raw: "{{baseUrl}}/api/mentors/profile",
  },
  {
    name: "Mentor profile get",
    method: "GET",
    raw: "{{baseUrl}}/api/mentors/profile",
  },
  {
    name: "Get mentor by id",
    method: "GET",
    raw: "{{baseUrl}}/api/mentors/{{mentorId}}",
  },
  {
    name: "Mentor document delete",
    method: "DELETE",
    raw: "{{baseUrl}}/api/mentors/documents/{{documentId}}",
  },
  {
    name: "Mentor document replace",
    method: "PUT",
    raw: "{{baseUrl}}/api/mentors/documents/{{documentId}}/replace",
  },
  {
    name: "Investor profile create",
    method: "POST",
    raw: "{{baseUrl}}/api/investors/profile",
  },
  {
    name: "Investor profile get",
    method: "GET",
    raw: "{{baseUrl}}/api/investors/profile",
  },
  {
    name: "Investment workflow offers",
    method: "POST",
    raw: "{{baseUrl}}/api/investment-workflow/offers",
  },
  {
    name: "Investment workflow portfolio",
    method: "GET",
    raw: "{{baseUrl}}/api/investment-workflow/portfolio",
  },
  {
    name: "Investment workflow received",
    method: "GET",
    raw: "{{baseUrl}}/api/investment-workflow/received",
  },
  {
    name: "Investment workflow admin",
    method: "GET",
    raw: "{{baseUrl}}/api/investment-workflow/admin/all",
  },
  {
    name: "Investment workflow feedback submit",
    method: "POST",
    raw: "{{baseUrl}}/api/investment-workflow/investments/{{investmentId}}/feedback",
  },
  {
    name: "Investment workflow feedback list",
    method: "GET",
    raw: "{{baseUrl}}/api/investment-workflow/feedback",
  },
  {
    name: "Mentorship workflow offers",
    method: "POST",
    raw: "{{baseUrl}}/api/mentorship-workflow/offers",
  },
  {
    name: "Mentorship workflow sessions",
    method: "GET",
    raw: "{{baseUrl}}/api/mentorship-workflow/sessions?mentorship_id={{mentorshipId}}",
  },
  {
    name: "Mentorship workflow resources",
    method: "POST",
    raw: "{{baseUrl}}/api/mentorship-workflow/resources",
  },
  {
    name: "Mentorship workflow admin",
    method: "GET",
    raw: "{{baseUrl}}/api/mentorship-workflow/admin/all",
  },
  {
    name: "Project workflow create",
    method: "POST",
    raw: "{{baseUrl}}/api/projects-workflow/projects",
  },
  {
    name: "Project workflow milestones create",
    method: "POST",
    raw: "{{baseUrl}}/api/projects-workflow/projects/{{projectId}}/milestones",
  },
  {
    name: "Project workflow milestones get",
    method: "GET",
    raw: "{{baseUrl}}/api/projects-workflow/projects/{{projectId}}/milestones",
  },
  {
    name: "Project workflow admin",
    method: "GET",
    raw: "{{baseUrl}}/api/projects-workflow/admin/all",
  },
  {
    name: "Transactions initiate",
    method: "POST",
    raw: "{{baseUrl}}/api/transactions/payments/initiate",
  },
  { name: "Transactions history", method: "GET", raw: "{{baseUrl}}/api/transactions/history" },
  {
    name: "Transactions verify",
    method: "GET",
    raw: "{{baseUrl}}/api/transactions/payments/{{paymentTxRef}}/verify",
  },
  {
    name: "Transactions webhook",
    method: "POST",
    raw: "{{baseUrl}}/api/transactions/webhooks/chapa",
  },
  {
    name: "Notifications list",
    method: "GET",
    raw: "{{baseUrl}}/api/notifications",
  },
  { name: "Messages base", method: "POST", raw: "{{baseUrl}}/api/messages" },
  {
    name: "Test dashboard",
    method: "GET",
    raw: "{{baseUrl}}/api/test/dashboard",
  },
  {
    name: "User profile get",
    method: "GET",
    raw: "{{baseUrl}}/api/users/profile",
  },
  {
    name: "User profile update",
    method: "PUT",
    raw: "{{baseUrl}}/api/users/profile",
  },
  {
    name: "Interaction create",
    method: "POST",
    raw: "{{baseUrl}}/api/interactions",
  },
  {
    name: "Interaction respond",
    method: "PUT",
    raw: "{{baseUrl}}/api/interactions/{{interactionId}}/respond",
  },
  {
    name: "Interaction active mentorships",
    method: "GET",
    raw: "{{baseUrl}}/api/interactions/relationships/mentorships",
  },
  {
    name: "Conversation create",
    method: "POST",
    raw: "{{baseUrl}}/api/conversations",
  },
  {
    name: "Conversation list",
    method: "GET",
    raw: "{{baseUrl}}/api/conversations/{{startupId}}",
  },
  { name: "Reports create", method: "POST", raw: "{{baseUrl}}/api/reports" },
  { name: "Reports my", method: "GET", raw: "{{baseUrl}}/api/reports/my" },
  {
    name: "Video session create",
    method: "POST",
    raw: "{{baseUrl}}/api/video-sessions",
  },
  {
    name: "Video session join",
    method: "POST",
    raw: "{{baseUrl}}/api/video-sessions/{{videoSessionId}}/join",
  },
  {
    name: "Video webhook",
    method: "POST",
    raw: "{{baseUrl}}/api/video-sessions/webhooks/zoom",
  },
  {
    name: "Admin users pending",
    method: "GET",
    raw: "{{baseUrl}}/api/admin/users/pending",
  },
  {
    name: "Admin users approve",
    method: "PUT",
    raw: "{{baseUrl}}/api/admin/users/approve/{{userId}}",
  },
  {
    name: "Admin startups list",
    method: "GET",
    raw: "{{baseUrl}}/api/admin/startups",
  },
  {
    name: "Admin projects list",
    method: "GET",
    raw: "{{baseUrl}}/api/admin/projects",
  },
  {
    name: "Admin investment requests",
    method: "GET",
    raw: "{{baseUrl}}/api/admin/investment-requests",
  },
  {
    name: "Admin mentorship overview",
    method: "GET",
    raw: "{{baseUrl}}/api/admin/mentorship/overview",
  },
  {
    name: "Admin audit logs",
    method: "GET",
    raw: "{{baseUrl}}/api/admin/audit-logs?limit=100&offset=0",
  },
  {
    name: "Admin reports overview",
    method: "GET",
    raw: "{{baseUrl}}/api/admin/reports/overview",
  },
  {
    name: "Admin maintenance status",
    method: "GET",
    raw: "{{baseUrl}}/api/admin/maintenance/status",
  },
];

const results = checks.map((c) => {
  const found = items.find((item) => item.normalizedUrl === c.raw && item.method === c.method);
  return {
    check: c.name,
    method: c.method,
    raw: c.raw,
    found: !!found,
    sample: found ? { url: found.url, method: found.method, bodyMode: found.bodyMode } : null,
  };
});

const foundCount = results.filter((r) => r.found).length;
const missingCount = results.length - foundCount;
const missingChecks = results
  .filter((r) => !r.found)
  .map((r) => ({
    check: r.check,
    method: r.method,
    raw: r.raw,
  }));

const mentorCreate = items.find(
  (item) => item.normalizedUrl === "{{baseUrl}}/api/mentors/profile" && item.method === "POST"
);

console.log(
  JSON.stringify(
    {
      collectionPath: p,
      totalRequests: items.length,
      totalChecks: checks.length,
      foundCount,
      missingCount,
      missingChecks,
      checks: results,
      mentorCreate: mentorCreate || null,
    },
    null,
    2
  )
);
