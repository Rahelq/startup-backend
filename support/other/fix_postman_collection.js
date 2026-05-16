const fs = require("fs");
const url = require("url");

const collectionPath = "./StartupConnect Backend API.postman_collection.json";
const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

// Function to parse a URL string and create proper Postman URL object
function parsePostmanUrl(rawUrl) {
	if (typeof rawUrl === "string") {
		// Parse the URL
		const parsed = new url.URL(rawUrl);
		const pathParts = parsed.pathname.split("/").filter((p) => p);
		const queryParts = [];

		parsed.searchParams.forEach((value, key) => {
			queryParts.push({ key, value });
		});

		return {
			raw: rawUrl,
			protocol: parsed.protocol.replace(":", ""),
			host: host,
			port: parsed.port ? parseInt(parsed.port) : "",
			path: pathParts,
			query: queryParts.length > 0 ? queryParts : undefined,
		};
	} else if (typeof rawUrl === "object" && rawUrl.raw) {
		// Already an object, just expand it
		const parsed = new url.URL(rawUrl.raw);
		const pathParts = parsed.pathname.split("/").filter((p) => p);
		const queryParts = [];

		parsed.searchParams.forEach((value, key) => {
			queryParts.push({ key, value });
		});

		// Parse host - keep as array for localhost, split for domains
		let host = parsed.hostname;
		if (host === "localhost") {
			host = ["localhost"];
		} else if (host && host.includes(".")) {
			host = host.split(".");
		}

		return {
			raw: rawUrl.raw,
			protocol: parsed.protocol.replace(":", ""),
			host: host,
			port: parsed.port ? parseInt(parsed.port) : "",
			path: pathParts,
			query: queryParts.length > 0 ? queryParts : undefined,
		};
	}
	return rawUrl;
}

// Recursively fix all requests in the collection
function fixRequests(arr) {
	arr.forEach((item) => {
		if (item.request && item.request.url) {
			item.request.url = parsePostmanUrl(item.request.url);
		}
		if (item.item) {
			fixRequests(item.item);
		}
	});
}

fixRequests(collection.item);

// Write the fixed collection back
fs.writeFileSync(collectionPath, JSON.stringify(collection, null, 2));
console.log("✓ Fixed Postman collection");
console.log(`  - Expanded URL objects with protocol, host, port, path`);
console.log(`  - Collection saved: ${collectionPath}`);
