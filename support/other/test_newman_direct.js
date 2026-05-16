const newman = require("newman");
const path = require("path");

const collectionPath = path.join(
	__dirname,
	"StartupConnect Backend API.postman_collection.json",
);

console.log("Running Newman with Auth folder...\n");

newman.run(
	{
		collection: collectionPath,
		folder: "Auth",
		reporters: ["cli"],
		bail: false,
		timeoutRequest: 10000,
	},
	function (err, summary) {
		if (err) {
			console.error("\nNewman Error:", err);
		}
		if (summary) {
			console.log("\n=== SUMMARY ===");
			console.log(
				`Failures: ${summary.failures ? summary.failures.length : 0}`,
			);
			if (summary.failures) {
				summary.failures.forEach((failure, i) => {
					console.log(`\nFailure ${i + 1}:`);
					console.log(
						`  Item: ${failure.parent.name ? failure.parent.name + " > " : ""}${failure.source.name}`,
					);
					console.log(`  Error: ${failure.error.message}`);
					console.log(`  Detail: ${failure.error.stack?.split("\n")[0]}`);
				});
			}
		}
	},
);
