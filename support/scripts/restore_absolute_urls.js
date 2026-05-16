const fs = require("fs");
const p = "./StartupConnect Backend API.postman_collection.json";
const col = JSON.parse(fs.readFileSync(p, "utf8"));
function walk(items) {
  items.forEach((item) => {
    if (item.request && item.request.url && item.request.url.raw) {
      let raw = item.request.url.raw;
      // If raw contains {{base_url}}, replace with http://localhost:3000
      raw = raw.replace(/{{\s*base_url\s*}}/, "http://localhost:3000");
      // Ensure raw starts with http
      if (!/^https?:\/\//.test(raw))
        raw = "http://localhost:3000" + (raw.startsWith("/") ? raw : "/" + raw);
      // Build path array from raw
      try {
        const urlObj = new URL(raw);
        const path = urlObj.pathname.split("/").filter(Boolean);
        item.request.url = {
          raw: raw,
          host: [urlObj.origin],
          path: ["api", ...path.slice(path[0] === "api" ? 1 : 0)],
        };
      } catch {
        // fallback
        item.request.url = { raw };
      }
    }
    if (item.item) walk(item.item);
  });
}
walk(col.item);
// Remove collection base_url variable to avoid confusion
col.variable = (col.variable || []).filter((v) => v.key !== "base_url");
fs.writeFileSync(p, JSON.stringify(col, null, 2), "utf8");
console.log(
  "Restored absolute http://localhost:3000 URLs in collection and removed base_url variable."
);
