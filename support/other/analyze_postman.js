const fs = require("fs");
const path = require("path");

const collectionPath = "./StartupConnect Backend API.postman_collection.json";
const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

const items = [];
const missingUrls = [];

function walk(arr, parent = "") {
	arr.forEach((x) => {
		const fullPath = parent ? `${parent} > ${x.name}` : x.name;
		if (x.request) {
			if (!x.request.url) {
				missingUrls.push(fullPath);
			}
			items.push({
				name: fullPath,
				hasUrl: !!x.request.url,
				urlType: typeof x.request.url,
			});
		}
		if (x.item) walk(x.item, fullPath);
	});
}

walk(collection.item);

console.log(`Total requests: ${items.length}`);
console.log(`Requests with missing URLs: ${missingUrls.length}\n`);

if (missingUrls.length > 0) {
	console.log("Missing URLs:");
	missingUrls.forEach((name) => console.log(`  - ${name}`));
}

console.log("\n\nSample request structures:");
items.slice(0, 5).forEach((item) => {
	console.log(`  ${item.name}: ${item.urlType}`);
});
