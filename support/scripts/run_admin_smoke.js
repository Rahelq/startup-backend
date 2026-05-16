const cp = require("child_process");

console.log("Running admin smoke tests...");

const spawn = (cmd, args) => {
  try {
    const out = cp.spawnSync(cmd, args, { encoding: "utf8" });
    return { ok: out.status === 0, out: out.stdout, err: out.stderr };
  } catch (e) {
    return { ok: false, out: "", err: e.message };
  }
};

const login = spawn("curl", [
  "-s",
  "-X",
  "POST",
  "http://localhost:3000/api/auth/login",
  "-H",
  "Content-Type: application/json",
  "-d",
  '{"email":"admin@startupconnect.test","password":"Demo123!"}',
]);
if (!login.ok) {
  console.error("Login failed", login.err || login.out);
  process.exit(1);
}
let token = "";
try {
  token = JSON.parse(login.out).token;
} catch {
  console.error("Failed parse login JSON", login.out);
  process.exit(1);
}
console.log("Token obtained", token ? token.slice(0, 20) + "..." : "(empty)");

const requests = [
  {
    name: "List Pending Users",
    args: [
      "-s",
      "-H",
      `Authorization: Bearer ${token}`,
      "http://localhost:3000/api/admin/users/pending",
    ],
  },
  {
    name: "Get Pending User 7",
    args: [
      "-s",
      "-H",
      `Authorization: Bearer ${token}`,
      "http://localhost:3000/api/admin/users/pending/7",
    ],
  },
  {
    name: "Approve User 7",
    args: [
      "-s",
      "-X",
      "PUT",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({ comment: "smoke test" }),
      "http://localhost:3000/api/admin/users/approve/7",
    ],
  },
  {
    name: "Get User 7",
    args: ["-s", "-H", `Authorization: Bearer ${token}`, "http://localhost:3000/api/admin/users/7"],
  },
  {
    name: "Reject User 6",
    args: [
      "-s",
      "-X",
      "PUT",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({ reason: "smoke reject" }),
      "http://localhost:3000/api/admin/users/reject/6",
    ],
  },
  {
    name: "Deactivate User 5",
    args: [
      "-s",
      "-X",
      "DELETE",
      "-H",
      `Authorization: Bearer ${token}`,
      "http://localhost:3000/api/admin/users/5",
    ],
  },
  {
    name: "List Startups",
    args: [
      "-s",
      "-H",
      `Authorization: Bearer ${token}`,
      "http://localhost:3000/api/admin/startups",
    ],
  },
  {
    name: "Approve Startup 2",
    args: [
      "-s",
      "-X",
      "PUT",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({}),
      "http://localhost:3000/api/admin/startups/2/approve",
    ],
  },
  {
    name: "Approve Mentor 2",
    args: [
      "-s",
      "-X",
      "PUT",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({}),
      "http://localhost:3000/api/admin/mentors/2/approve",
    ],
  },
  {
    name: "Approve Investor 2",
    args: [
      "-s",
      "-X",
      "PUT",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({}),
      "http://localhost:3000/api/admin/investors/2/approve",
    ],
  },
  {
    name: "List Investment Requests",
    args: [
      "-s",
      "-H",
      `Authorization: Bearer ${token}`,
      "http://localhost:3000/api/admin/investment-requests",
    ],
  },
  {
    name: "Update InvestmentRequest 1 approved",
    args: [
      "-s",
      "-X",
      "PUT",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({ status: "approved", comment: "smoke" }),
      "http://localhost:3000/api/admin/investment-requests/1/status",
    ],
  },
  {
    name: "List Investments",
    args: [
      "-s",
      "-H",
      `Authorization: Bearer ${token}`,
      "http://localhost:3000/api/admin/investments",
    ],
  },
  {
    name: "Export Audit Logs (HEAD)",
    args: [
      "-s",
      "-I",
      "-H",
      `Authorization: Bearer ${token}`,
      "http://localhost:3000/api/admin/audit-logs/export",
    ],
  },
  {
    name: "Export Reports (HEAD)",
    args: [
      "-s",
      "-I",
      "-H",
      `Authorization: Bearer ${token}`,
      "http://localhost:3000/api/admin/reports/export?type=users",
    ],
  },
  {
    name: "Create Temp Admin",
    args: [
      "-s",
      "-X",
      "POST",
      "-H",
      `Authorization: Bearer ${token}`,
      "-H",
      "Content-Type: application/json",
      "-d",
      JSON.stringify({
        first_name: "Tmp",
        last_name: "Admin",
        email: "temp.admin@test",
        password: "Temp1234!",
        privilege_level: 1,
      }),
      "http://localhost:3000/api/admin/create-admin",
    ],
  },
];

for (const r of requests) {
  console.log("\n>>", r.name);
  const res = spawn("curl", r.args);
  if (res.ok) {
    console.log("OK:", (res.out || "").substring(0, 1000));
  } else {
    console.log("ERR:", res.err || res.out);
  }
}

console.log("\nSmoke tests finished.");
