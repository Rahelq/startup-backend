const fs = require("fs");

const collectionPath = "./StartupConnect Backend API.postman_collection.json";
const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

let issues = [];

function walk(arr, parent = "") {
	arr.forEach((x) => {
		const fullPath = parent ? `${parent} > ${x.name}` : x.name;
		if (x.request && x.request.url) {
			const url = x.request.url;

			// Check if url is string (should be object with 'raw' property for Newman)
			if (typeof url === "string") {
				issues.push({
					path: fullPath,
					issue: "URL is string, should be object",
					url: url,
				});
			}
			// Check if url is object but missing 'raw'
			else if (typeof url === "object" && !url.raw) {
				issues.push({
					path: fullPath,
					issue: 'URL object missing "raw" property',
					url: JSON.stringify(url),
				});
			}
			// Check if url.raw is empty
			else if (typeof url === "object" && url.raw === "") {
				issues.push({
					path: fullPath,
					issue: "URL.raw is empty string",
					url: JSON.stringify(url),
				});
			}
		}
		if (x.item) walk(x.item, fullPath);
	});
}

walk(collection.item);

console.log(`Issues found: ${issues.length}\n`);
if (issues.length > 0) {
	issues.forEach((issue, i) => {
		console.log(`${i + 1}. ${issue.path}`);
		console.log(`   Issue: ${issue.issue}`);
		console.log(`   URL: ${issue.url}\n`);
	});
}

// Also check for folder items that have no requests
function checkFolders(arr, parent = "") {
	arr.forEach((x) => {
		const fullPath = parent ? `${parent} > ${x.name}` : x.name;
		// Folder with no request and no subitems
		if (!x.request && (!x.item || x.item.length === 0)) {
			console.log(`Empty folder: ${fullPath}`);
		}
		if (x.item) checkFolders(x.item, fullPath);
	});
}

console.log("\nChecking for empty folders...");
checkFolders(collection.item);
