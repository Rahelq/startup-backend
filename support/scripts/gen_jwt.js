const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "your_secret_key";

const [, , userIdArg, roleArg] = process.argv;
if (!userIdArg) {
	console.error("Usage: node gen_jwt.js <userId> [role]");
	process.exit(2);
}
const user_id = Number(userIdArg);
const role = roleArg || "Startup";
const token = jwt.sign({ user_id, role }, JWT_SECRET, { expiresIn: "7d" });
console.log(token);
