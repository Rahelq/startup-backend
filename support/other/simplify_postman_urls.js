const fs = require("fs");

const collectionPath = "./StartupConnect Backend API.postman_collection.json";
const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

// Simplify URLs to just raw strings
function simplifyUrls(arr) {
	arr.forEach((item) => {
		if (
			item.request &&
			item.request.url &&
			typeof item.request.url === "object" &&
			item.request.url.raw
		) {
			// Convert to simple string URL
			item.request.url = item.request.url.raw;
		}
		if (item.item) {
			simplifyUrls(item.item);
		}
	});
}

simplifyUrls(collection.item);

// Write the fixed collection back
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log("✓ Simplified Postman collection");
console.log(`  - Converted URLs to simple string format`);
console.log(`  - Collection saved: ${collectionPath}`);
