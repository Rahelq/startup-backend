const baseUrl = process.env.BASE_URL || "http://localhost:3000";

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = text;
  }
  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`);
    error.status = response.status;
    error.body = body;
    throw error;
  }
  return body;
}

async function login(email, password) {
  const result = await requestJson(`${baseUrl}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  return result.token;
}

async function main() {
  const startupToken = await login("startup@startupconnect.test", "Demo123!");
  const investorToken = await login("investor@startupconnect.test", "Demo123!");

  const userProfile = await requestJson(`${baseUrl}/api/users/profile`, {
    headers: { Authorization: `Bearer ${startupToken}` },
  });
  console.log("USER_PROFILE_GET_OK", userProfile.user && userProfile.user.role);

  const updatedUserProfile = await requestJson(`${baseUrl}/api/users/profile`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${startupToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ phone_number: "+251911000001" }),
  });
  console.log(
    "USER_PROFILE_PUT_OK",
    updatedUserProfile.message,
    updatedUserProfile.user && updatedUserProfile.user.phone_number
  );

  const startupProfile = await requestJson(`${baseUrl}/api/startups/profile`, {
    headers: { Authorization: `Bearer ${startupToken}` },
  });
  console.log("STARTUP_PROFILE_GET_OK", startupProfile.startup_name || startupProfile.startup_id);

  const investors = await requestJson(`${baseUrl}/api/investors`, {
    headers: { Authorization: `Bearer ${investorToken}` },
  });
  console.log("INVESTOR_DISCOVERY_GET_OK", Array.isArray(investors) ? investors.length : 0);

  console.log("USER_PROFILE_FLOW_TEST_PASSED");
}

main().catch((err) => {
  console.error("USER_PROFILE_FLOW_TEST_FAILED", err.body || err.message);
  process.exit(1);
});
