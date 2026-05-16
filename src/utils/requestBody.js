function normalizeMultipartBody(body, preferredKeys = ["data", "payload", "body"]) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return {};
  }

  for (const key of preferredKeys) {
    const rawValue = body[key];
    if (typeof rawValue !== "string" || rawValue.trim() === "") {
      continue;
    }

    try {
      const parsed = JSON.parse(rawValue);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed;
      }
    } catch {
      // Keep the original form-data fields if the blob is not valid JSON.
    }
  }

  return body;
}

module.exports = {
  normalizeMultipartBody,
};
