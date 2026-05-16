const fs = require("fs");

const collectionPath = "./StartupConnect Backend API.postman_collection.json";
const collection = JSON.parse(fs.readFileSync(collectionPath, "utf8"));

// Find first request
function findFirst(arr) {
	for (let x of arr) {
		if (x.request) {
			console.log("Request name:", x.name);
			console.log("\nURL structure:");
			console.log(JSON.stringify(x.request.url, null, 2));
			return;
		}
		if (x.item) findFirst(x.item);
	}
}

findFirst(collection.item);
