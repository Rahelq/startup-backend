const fs = require("fs");

const collectionPath = "./StartupConnect Backend API.postman_collection.json";
const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

// Find first few requests and print their structure
function walk(arr, depth = 0) {
	for (let x of arr) {
		if (depth < 2) {
			if (x.request) {
				console.log(`\n=== ${x.name} ===`);
				console.log("Request structure:");
				console.log(JSON.stringify(x.request, null, 2).substring(0, 500));
				if (JSON.stringify(x.request).length > 500) {
					console.log("... (truncated)");
				}
				return; // Stop after first request
			}
			if (x.item) walk(x.item, depth + 1);
		}
	}
}

walk(collection.item);
