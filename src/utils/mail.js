const nodemailer = require("nodemailer");

const SMTP_HOST = process.env.SMTP_HOST;
const SMTP_PORT = process.env.SMTP_PORT;
const SMTP_USER = process.env.SMTP_USER;
const SMTP_PASS = process.env.SMTP_PASS;
const FROM_EMAIL = process.env.FROM_EMAIL || "no-reply@startupconnect.local";

let transporter = null;
if (SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS) {
	transporter = nodemailer.createTransport({
		host: SMTP_HOST,
		port: Number(SMTP_PORT),
		secure: Number(SMTP_PORT) === 465, // true for 465, false for other ports
		auth: {
			user: SMTP_USER,
			pass: SMTP_PASS,
		},
	});
}

async function sendMail(to, subject, text, html) {
	if (!transporter) {
		// fallback: log to console
		console.log(
			"[mail-fallback] to=",
			to,
			"subject=",
			subject,
			"text=",
			text || html,
		);
		return Promise.resolve();
	}

	const info = await transporter.sendMail({
		from: FROM_EMAIL,
		to,
		subject,
		text: text || (html ? html.replace(/<[^>]+>/g, "") : ""),
		html,
	});
	return info;
}

module.exports = { sendMail };
