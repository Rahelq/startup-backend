// ============================================
// Interaction Validation Utilities
// ============================================

exports.validateInteractionCreation = (body) => {
	const errors = [];

	// Required fields
	if (!body.receiver_id) {
		errors.push("receiver_id is required");
	} else if (isNaN(parseInt(body.receiver_id))) {
		errors.push("receiver_id must be a valid integer");
	}

	if (!body.type) {
		errors.push("type is required");
	} else if (!["request", "invite"].includes(body.type)) {
		errors.push("type must be 'request' or 'invite'");
	}

	if (!body.category) {
		errors.push("category is required");
	} else if (!["mentorship", "investment"].includes(body.category)) {
		errors.push("category must be 'mentorship' or 'investment'");
	}

	// Optional message
	if (body.message && typeof body.message !== "string") {
		errors.push("message must be a string");
	}

	// Investment-specific validations
	if (body.category === "investment") {
		if (body.funding_amount && isNaN(parseFloat(body.funding_amount))) {
			errors.push("funding_amount must be a valid number");
		}
		if (body.equity_offer && isNaN(parseFloat(body.equity_offer))) {
			errors.push("equity_offer must be a valid number");
		}
		if (
			body.equity_offer &&
			(parseFloat(body.equity_offer) < 0 || parseFloat(body.equity_offer) > 100)
		) {
			errors.push("equity_offer must be between 0 and 100");
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

exports.validateInteractionResponse = (body) => {
	const errors = [];

	if (!body.status) {
		errors.push("status is required");
	} else if (!["accepted", "rejected"].includes(body.status)) {
		errors.push("status must be 'accepted' or 'rejected'");
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

exports.validateRoles = (senderRole, receiverRole, category) => {
	const errors = [];

	if (category === "mentorship") {
		const validCombos = [
			["Mentor", "Startup"],
			["Startup", "Mentor"],
		];

		const isValid = validCombos.some(
			(combo) => combo[0] === senderRole && combo[1] === receiverRole,
		);

		if (!isValid) {
			errors.push("Mentorship requires one Mentor and one Startup");
		}
	} else if (category === "investment") {
		const validCombos = [
			["Investor", "Startup"],
			["Startup", "Investor"],
		];

		const isValid = validCombos.some(
			(combo) => combo[0] === senderRole && combo[1] === receiverRole,
		);

		if (!isValid) {
			errors.push("Investment requires one Investor and one Startup");
		}
	}

	return {
		isValid: errors.length === 0,
		errors,
	};
};

exports.identifyMentorAndStartup = (sender, receiver) => {
	return {
		mentor: sender.role === "Mentor" ? sender : receiver,
		startup: sender.role === "Startup" ? sender : receiver,
	};
};

exports.identifyInvestorAndStartup = (sender, receiver) => {
	return {
		investor: sender.role === "Investor" ? sender : receiver,
		startup: sender.role === "Startup" ? sender : receiver,
	};
};
