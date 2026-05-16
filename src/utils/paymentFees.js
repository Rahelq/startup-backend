const PLATFORM_FEES = {
  mentorship_session: 0.02,
  mentorship_plan: 0.02,
  investment_funding: 0.05,
  milestone_release: 0.05,
  consultation: 0.02,
  subscription: 0,
  platform_fee: 0,
};

function getFeeRate(paymentType) {
  return PLATFORM_FEES[paymentType] ?? 0;
}

function calculateFeeBreakdown(amount, paymentType) {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) {
    throw Object.assign(new Error("amount must be a positive number"), { status: 400 });
  }

  const rate = getFeeRate(paymentType);
  const platformFee = Number((value * rate).toFixed(2));
  const receiverAmount = Number((value - platformFee).toFixed(2));

  return {
    amount: Number(value.toFixed(2)),
    rate,
    platform_fee: platformFee,
    receiver_amount: receiverAmount,
  };
}

module.exports = {
  PLATFORM_FEES,
  getFeeRate,
  calculateFeeBreakdown,
};
