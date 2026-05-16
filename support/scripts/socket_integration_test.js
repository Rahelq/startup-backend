const { io } = require("socket.io-client");
const assert = require("assert");
const pool = require("../config/db");

const baseUrl = process.env.BASE_URL || "http://localhost:3000";
const demoPassword = process.env.DEMO_PASSWORD || "Demo123!";
const startupEmail = process.env.STARTUP_EMAIL || "startup@startupconnect.test";
const mentorEmail = process.env.MENTOR_EMAIL || "mentor@startupconnect.test";
const timeoutMs = Number(process.env.SOCKET_TEST_TIMEOUT_MS || 15000);
const verbose = process.env.SOCKET_TEST_VERBOSE === "1";

function vlog(...args) {
	if (verbose) console.log("[socket-test]", ...args);
}

async function login(email, password) {
	const res = await fetch(`${baseUrl}/api/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ email, password }),
	});

	const text = await res.text();
	if (!res.ok) {
		throw new Error(`Login failed for ${email}: ${text}`);
	}

	return JSON.parse(text);
}

function waitFor(socket, eventName, predicate, label) {
	return new Promise((resolve, reject) => {
		const timer = setTimeout(() => {
			socket.off(eventName, handler);
			reject(new Error(`Timed out waiting for ${label || eventName}`));
		}, timeoutMs);

		function handler(payload) {
			try {
				if (predicate && !predicate(payload)) return;
				clearTimeout(timer);
				socket.off(eventName, handler);
				resolve(payload);
			} catch (err) {
				clearTimeout(timer);
				socket.off(eventName, handler);
				reject(err);
			}
		}

		socket.on(eventName, handler);
	});
}

function joinPair(socket, otherUserId) {
	return new Promise((resolve, reject) => {
		socket.emit("joinPair", { otherUserId, type: "mentorship" }, (response) => {
			if (response && response.ok) return resolve(response);
			reject(new Error((response && response.error) || "joinPair failed"));
		});
	});
}

function sendMessage(socket, otherUserId, body) {
	return new Promise((resolve, reject) => {
		socket.emit("sendMessage", { otherUserId, body }, (response) => {
			if (response && response.ok) return resolve(response.message);
			reject(new Error((response && response.error) || "sendMessage failed"));
		});
	});
}

function markRead(socket, messageId) {
	return new Promise((resolve, reject) => {
		socket.emit("message:read", { messageId }, (response) => {
			if (response && response.ok) return resolve(response);
			reject(new Error((response && response.error) || "message:read failed"));
		});
	});
}

async function getUnreadCountFromDb(userId) {
	const result = await pool.query(
		"SELECT COUNT(*)::int AS cnt FROM messages WHERE receiver_user_id = $1 AND is_read = false",
		[userId],
	);
	return result.rows[0] ? result.rows[0].cnt : 0;
}

async function main() {
	const startupLogin = await login(startupEmail, demoPassword);
	const mentorLogin = await login(mentorEmail, demoPassword);

	const startupUserId = startupLogin.user.user_id;
	const mentorUserId = mentorLogin.user.user_id;

	const startupSocket = io(baseUrl, {
		auth: { token: startupLogin.token },
		transports: ["websocket"],
	});
	const mentorSocket = io(baseUrl, {
		auth: { token: mentorLogin.token },
		transports: ["websocket"],
	});

	if (verbose) {
		startupSocket.onAny((event, payload) => {
			vlog("startup event", event, payload);
		});
		mentorSocket.onAny((event, payload) => {
			vlog("mentor event", event, payload);
		});
	}

	const cleanup = () => {
		startupSocket.close();
		mentorSocket.close();
	};

	try {
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

		const startupPresence = waitFor(
			startupSocket,
			"presence:init",
			(payload) => Array.isArray(payload && payload.users),
			"startup presence:init",
		);
		const mentorPresence = waitFor(
			mentorSocket,
			"presence:init",
			(payload) => Array.isArray(payload && payload.users),
			"mentor presence:init",
		);

		await Promise.all([
			joinPair(startupSocket, mentorUserId),
			joinPair(mentorSocket, startupUserId),
		]);

		const [startupPresencePayload, mentorPresencePayload] = await Promise.all([
			startupPresence,
			mentorPresence,
		]);

		for (const payload of [startupPresencePayload, mentorPresencePayload]) {
			const users = payload.users || [];
			const startupState = users.find(
				(entry) => entry.user_id === startupUserId,
			);
			const mentorState = users.find((entry) => entry.user_id === mentorUserId);
			assert(startupState && startupState.online === true);
			assert(mentorState && mentorState.online === true);
		}

		const baselineUnreadCount = await getUnreadCountFromDb(mentorUserId);
		const mentorTyping = waitFor(
			mentorSocket,
			"typing",
			(payload) => payload.from === startupUserId,
			"mentor typing",
		);
		const mentorMessage = waitFor(
			mentorSocket,
			"message:new",
			(payload) => payload.sender_user_id === startupUserId,
			"mentor message:new",
		);
		const startupMessageRead = waitFor(
			startupSocket,
			"message:read",
			(payload) => payload.by === mentorUserId,
			"startup message:read",
		);
		const mentorUnreadAfterRead = (baseline) =>
			waitFor(
				mentorSocket,
				"unread:count",
				(payload) =>
					payload.user_id === mentorUserId && payload.count === baseline,
				"mentor unread reset",
			);

		startupSocket.emit("typing", { otherUserId: mentorUserId, typing: true });
		const mentorUnreadAfterSend = waitFor(
			mentorSocket,
			"unread:count",
			(payload) =>
				payload.user_id === mentorUserId &&
				payload.count === baselineUnreadCount + 1,
			"mentor unread increment",
		);

		const sentMessage = await sendMessage(
			startupSocket,
			mentorUserId,
			"hello from startup",
		);
		const deliveredMessage = await mentorMessage;
		const unreadPayload = await mentorUnreadAfterSend;
		const typingPayload = await mentorTyping;

		assert.strictEqual(deliveredMessage.message_id, sentMessage.message_id);
		assert.strictEqual(deliveredMessage.body, "hello from startup");
		assert.strictEqual(unreadPayload.count, baselineUnreadCount + 1);
		assert.strictEqual(typingPayload.typing, true);

		const resetPromise = mentorUnreadAfterRead(baselineUnreadCount);
		await markRead(mentorSocket, deliveredMessage.message_id);
		await startupMessageRead;
		const resetPayload = await resetPromise;
		assert.strictEqual(resetPayload.count, baselineUnreadCount);

		console.log("Socket integration test passed");
	} finally {
		cleanup();
		await pool.end();
	}
}

main().catch((err) => {
	console.error("Socket integration test failed:", err.message);
	pool.end().catch(() => null);
	process.exit(1);
});
