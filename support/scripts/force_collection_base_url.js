const fs = require("fs");
const p = "./StartupConnect Backend API.postman_collection.json";
const col = JSON.parse(fs.readFileSync(p, "utf8"));
function walk(items) {
	items.forEach((item) => {
		if (item.request && item.request.url && item.request.url.raw) {
			const raw = item.request.url.raw;
			// remove protocol+host if present
			const idx = raw.indexOf("://");
			let path = raw;
			if (idx !== -1) {
				const after = raw.slice(idx + 3);
				const slash = after.indexOf("/");
				path = slash === -1 ? "/" : after.slice(slash);
			}
			// ensure path starts with /
			if (!path.startsWith("/")) path = "/" + path;
			item.request.url = { raw: "{{base_url}}" + path };
		}
		if (item.item) walk(item.item);
	});
}
walk(col.item);
// Ensure collection variable exists
col.variable = col.variable || [];
if (!col.variable.find((v) => v.key === "base_url"))
	col.variable.unshift({ key: "base_url", value: "http://localhost:3000" });
fs.writeFileSync(p, JSON.stringify(col, null, 2), "utf8");
console.log("Collection updated to use {{base_url}} for all requests.");
