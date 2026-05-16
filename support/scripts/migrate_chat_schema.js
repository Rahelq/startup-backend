const pool = require("../config/db");

async function columnExists(tableName, columnName) {
	const result = await pool.query(
		`SELECT 1
		 FROM information_schema.columns
		 WHERE table_name = $1 AND column_name = $2`,
		[tableName, columnName],
	);
	return result.rowCount > 0;
}

async function tableExists(tableName) {
	const result = await pool.query(
		`SELECT 1
		 FROM information_schema.tables
		 WHERE table_name = $1`,
		[tableName],
	);
	return result.rowCount > 0;
}

async function main() {
	await pool.query(`
		CREATE TABLE IF NOT EXISTS conversations (
			conversation_id SERIAL PRIMARY KEY,
			user1_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
			user2_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
			conversation_type VARCHAR(50) NOT NULL DEFAULT 'direct' CHECK (conversation_type IN ('direct', 'mentor_chat', 'investment_chat')),
			last_message_at TIMESTAMPTZ,
			created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
			CHECK (user1_id <> user2_id),
			UNIQUE (user1_id, user2_id, conversation_type)
		)
	`);

	const alters = [];
	if (!(await columnExists("messages", "conversation_id"))) {
		alters.push(
			"ALTER TABLE messages ADD COLUMN conversation_id INTEGER REFERENCES conversations(conversation_id) ON DELETE CASCADE",
		);
	}
	if (!(await columnExists("messages", "message_type"))) {
		alters.push(
			"ALTER TABLE messages ADD COLUMN message_type VARCHAR(30) NOT NULL DEFAULT 'text'",
		);
	}
	if (!(await columnExists("messages", "message"))) {
		alters.push("ALTER TABLE messages ADD COLUMN message TEXT");
	}
	if (!(await columnExists("messages", "attachment_name"))) {
		alters.push("ALTER TABLE messages ADD COLUMN attachment_name VARCHAR(255)");
	}
	if (!(await columnExists("messages", "attachment_path"))) {
		alters.push("ALTER TABLE messages ADD COLUMN attachment_path TEXT");
	}
	if (!(await columnExists("messages", "attachment_mime"))) {
		alters.push("ALTER TABLE messages ADD COLUMN attachment_mime VARCHAR(150)");
	}
	if (!(await columnExists("messages", "attachment_size"))) {
		alters.push("ALTER TABLE messages ADD COLUMN attachment_size BIGINT");
	}
	if (!(await columnExists("messages", "edited_at"))) {
		alters.push("ALTER TABLE messages ADD COLUMN edited_at TIMESTAMPTZ");
	}
	if (!(await columnExists("messages", "edited_by_user_id"))) {
		alters.push(
			"ALTER TABLE messages ADD COLUMN edited_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL",
		);
	}
	if (!(await columnExists("messages", "status"))) {
		alters.push(
			"ALTER TABLE messages ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT 'sent'",
		);
	}
	if (!(await columnExists("messages", "delivered_at"))) {
		alters.push("ALTER TABLE messages ADD COLUMN delivered_at TIMESTAMPTZ");
	}
	if (!(await columnExists("messages", "seen_at"))) {
		alters.push("ALTER TABLE messages ADD COLUMN seen_at TIMESTAMPTZ");
	}
	if (!(await columnExists("messages", "deleted_at"))) {
		alters.push("ALTER TABLE messages ADD COLUMN deleted_at TIMESTAMPTZ");
	}
	if (!(await columnExists("users", "last_seen_at"))) {
		alters.push("ALTER TABLE users ADD COLUMN last_seen_at TIMESTAMPTZ");
	}

	for (const sql of alters) {
		await pool.query(sql);
	}

	if (alters.length) {
		console.log(`Applied ${alters.length} chat schema changes`);
	} else {
		console.log("Chat schema already up to date");
	}

	if (await tableExists("messages")) {
		await pool.query(
			"CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id)",
		);
		await pool.query(
			"CREATE INDEX IF NOT EXISTS idx_messages_sender_user_id ON messages(sender_user_id)",
		);
		await pool.query(
			"CREATE INDEX IF NOT EXISTS idx_messages_receiver_user_id ON messages(receiver_user_id)",
		);
	}

	await pool.end();
}

main().catch(async (err) => {
	console.error("Chat schema migration failed:", err.message || err);
	try {
		await pool.end();
	} catch {}
	process.exit(1);
});
