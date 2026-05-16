const { io } = require("socket.io-client");

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const demoPassword = process.env.DEMO_PASSWORD || "Demo123!";
const startupEmail = process.env.STARTUP_EMAIL || "startup@startupconnect.test";
const mentorEmail = process.env.MENTOR_EMAIL || "mentor@startupconnect.test";

async function login(email, password) {
	const res = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});
	const text = await res.text();
	if (!res.ok) throw new Error(`Login failed for ${email}: ${text}`);
	return JSON.parse(text);
}

function joinPair(socket, otherUserId) {
	return new Promise((resolve, reject) => {
		socket.emit("joinPair", { otherUserId, type: "mentorship" }, (res) => {
			if (res && res.ok) return resolve(res);
			reject(new Error((res && res.error) || "joinPair failed"));
		});
	});
}

async function main() {
	const startupLogin = await login(startupEmail, demoPassword);
	const mentorLogin = await login(mentorEmail, demoPassword);

	const startupSocket = io(baseUrl, {
		auth: { token: startupLogin.token },
		transports: ["websocket"],
	});
	const mentorSocket = io(baseUrl, {
		auth: { token: mentorLogin.token },
		transports: ["websocket"],
	});

	startupSocket.onAny((event, payload) => {
		console.log("[startup]", event, payload || "");
	});
	mentorSocket.onAny((event, payload) => {
		console.log("[mentor]", event, payload || "");
	});

	await Promise.all([
		new Promise((resolve, reject) => {
			startupSocket.on("connect", resolve);
			startupSocket.on("connect_error", reject);
		}),
		new Promise((resolve, reject) => {
			mentorSocket.on("connect", resolve);
			mentorSocket.on("connect_error", reject);
		}),
	]);

	console.log("Both clients connected");
	await Promise.all([
		joinPair(startupSocket, mentorLogin.user.user_id),
		joinPair(mentorSocket, startupLogin.user.user_id),
	]);

	console.log("Both clients joined pair; sending typing + message");
	startupSocket.emit("typing", {
		otherUserId: mentorLogin.user.user_id,
		typing: true,
	});
	startupSocket.emit(
		"sendMessage",
		{ otherUserId: mentorLogin.user.user_id, body: "probe message" },
		(res) => console.log("sendMessage cb", res),
	);

	setTimeout(() => {
		startupSocket.close();
		mentorSocket.close();
		console.log("Probe complete");
		process.exit(0);
	}, 5000);
}

main().catch((err) => {
	console.error("Probe failed:", err.message);
	process.exit(1);
});
