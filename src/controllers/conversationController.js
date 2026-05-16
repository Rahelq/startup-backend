const chatService = require("../services/chatService");

exports.createOrGetConversation = async (req, res) => {
	try {
		const { user_id: authUserId } = req.user;
		const { user1_id, user2_id, conversation_type } = req.body || {};
		const firstUserId = Number(user1_id || authUserId);
		const secondUserId = Number(user2_id);

		if (!Number.isInteger(firstUserId) || !Number.isInteger(secondUserId)) {
			return res
				.status(400)
				.json({ error: "user1_id and user2_id are required" });
		}

		if (authUserId !== firstUserId && authUserId !== secondUserId) {
			return res
				.status(403)
				.json({ error: "You can only create conversations you belong to" });
		}

		const conversationType = conversation_type || undefined;
		const conversation = await chatService.createConversation(
			firstUserId,
			secondUserId,
			conversationType,
		);

		return res.status(200).json({ conversation });
	} catch (err) {
		const status =
			err.message === "Not authorized to start this conversation"
				? 403
				: err.message === "Invalid conversation participants"
					? 400
					: 500;
		return res.status(status).json({ error: err.message });
	}
};

exports.listMyConversations = async (req, res) => {
	try {
		const { user_id: authUserId } = req.user;
		const targetUserId = req.params.userId
			? Number(req.params.userId)
			: authUserId;
		if (!Number.isInteger(targetUserId)) {
			return res.status(400).json({ error: "Invalid user id" });
		}
		if (targetUserId !== authUserId) {
			return res
				.status(403)
				.json({ error: "You can only view your own conversations" });
		}

		const conversations =
			await chatService.listConversationsForUser(targetUserId);
		return res.status(200).json({ conversations });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};

exports.getConversationByParticipants = async (req, res) => {
	try {
		const { user_id: authUserId } = req.user;
		const otherUserId = Number(req.params.otherUserId);
		const conversationType = req.query.conversation_type;
		if (!Number.isInteger(otherUserId)) {
			return res.status(400).json({ error: "Invalid other user id" });
		}
		const conversation = await chatService.getConversationByParticipants(
			authUserId,
			otherUserId,
			conversationType,
		);
		if (!conversation) {
			return res.status(404).json({ error: "Conversation not found" });
		}
		return res.status(200).json({ conversation });
	} catch (err) {
		return res.status(500).json({ error: err.message });
	}
};
