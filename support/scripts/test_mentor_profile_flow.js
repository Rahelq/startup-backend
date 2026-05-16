const baseUrl = process.env.BASE_URL || "http://localhost:3000";

function uniqueEmail() {
  return `mentor.${Date.now()}@startupconnect.test`;
}

async function requestJson(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {}
  if (!res.ok) {
    const error = new Error(`Request failed with status ${res.status}`);
    error.status = res.status;
    error.body = json || text;
    throw error;
  }
  return json;
}

async function registerMentor(email, password) {
  return requestJson(`${baseUrl}/api/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      full_name: "Test Mentor",
      email,
      password,
      role: "Mentor",
    }),
  });
}

async function login(email, password) {
  const result = await requestJson(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return result.token;
}

function buildProfileForm(payload, fileFieldName) {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) {
    if (value === undefined || value === null) continue;
    form.append(key, typeof value === "string" ? value : JSON.stringify(value));
  }
  if (fileFieldName) {
    const blob = new Blob(["mentor profile test file"], { type: "text/plain" });
    form.append(fileFieldName, blob, `${fileFieldName}.txt`);
  }
  return form;
}

async function main() {
  const email = uniqueEmail();
  const password = "Demo123!";

  const registered = await registerMentor(email, password);
  console.log("REGISTERED", JSON.stringify(registered));

  const token = await login(email, password);

  const createForm = buildProfileForm(
    {
      headline: "Mentor for early-stage startups",
      expertise: "Product, Growth, Go-to-Market",
      skills: ["Node.js", "Strategy", "Fundraising"],
      industries: ["FinTech", "HealthTech"],
      years_experience: 7,
      hourly_rate: 75,
      country: "Ethiopia",
      bio: "I help founders move from idea to traction.",
      profile_picture: "https://example.com/profile.jpg",
      availability: [
        { day_of_week: 1, start_time: "09:00:00", end_time: "12:00:00" },
        { day_of_week: 3, start_time: "13:00:00", end_time: "17:00:00" },
      ],
    },
    "cv"
  );

  const created = await requestJson(`${baseUrl}/api/mentors/profile`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: createForm,
  });
  console.log("PROFILE_CREATED", JSON.stringify(created));

  const current = await requestJson(`${baseUrl}/api/mentors/profile`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("PROFILE_FETCHED", JSON.stringify(current));

  const updateForm = buildProfileForm({
    bio: "Updated bio for testing.",
    skills: ["Node.js", "PostgreSQL"],
    industries: ["FinTech"],
    hourly_rate: 90,
    profile_picture: "https://example.com/profile-updated.jpg",
  });

  const updated = await requestJson(`${baseUrl}/api/mentors/profile`, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}` },
    body: updateForm,
  });
  console.log("PROFILE_UPDATED", JSON.stringify(updated));

  const finalProfile = await requestJson(`${baseUrl}/api/mentors/profile`, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });
  console.log("FINAL_PROFILE", JSON.stringify(finalProfile));

  console.log("MENTOR_PROFILE_FLOW_TEST_PASSED");
}

main().catch((err) => {
  console.error("MENTOR_PROFILE_FLOW_TEST_FAILED", err.body || err.message);
  process.exit(1);
});
