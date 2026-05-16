const investmentRequestModel = require("../models/investmentRequestModel");
const investmentModel = require("../models/investmentModel");
const paymentModel = require("../models/paymentModel");
const startupModel = require("../models/startupModel");
const investorModel = require("../models/investorModel");

// Create investment request from startup to investor
exports.createInvestmentRequest = async (startupId, investorId, amount, equity, description) => {
  // Verify startup exists
  const startup = await startupModel.findById(startupId);
  if (!startup) {
    throw { status: 404, message: "Startup not found" };
  }

  // Verify investor exists
  const investor = await investorModel.findById(investorId);
  if (!investor) {
    throw { status: 404, message: "Investor not found" };
  }

  // Create request
  const request = await investmentRequestModel.create({
    startupId,
    investorId,
    amount,
    equity,
    description,
    status: "pending",
  });

  return request;
};

// Respond to investment request
exports.respondToInvestmentRequest = async (requestId, status, responderId, isStartup) => {
  const request = await investmentRequestModel.findById(requestId);
  if (!request) {
    throw { status: 404, message: "Investment request not found" };
  }

  // Verify authorization
  if (isStartup) {
    const startup = await startupModel.findById(request.startup_id);
    if (!startup || startup.user_id !== responderId) {
      throw { status: 403, message: "Not authorized to respond to this request" };
    }
  } else {
    const investor = await investorModel.findById(request.investor_id);
    if (!investor || investor.user_id !== responderId) {
      throw { status: 403, message: "Not authorized to respond to this request" };
    }
  }

  // Update status
  const updated = await investmentRequestModel.update(requestId, { status });

  // If accepted, create investment
  if (status === "accepted") {
    const investment = await investmentModel.create({
      investmentRequestId: requestId,
      investorId: request.investor_id,
      startupId: request.startup_id,
      amount: request.amount,
      equity: request.equity,
      status: "active",
    });
    return { request: updated, investment };
  }

  return { request: updated };
};

// Record investment payment
exports.recordInvestmentPayment = async (
  investmentId,
  amount,
  paymentMethod,
  transactionReference
) => {
  const investment = await investmentModel.findById(investmentId);
  if (!investment) {
    throw { status: 404, message: "Investment not found" };
  }

  const payment = await paymentModel.create({
    investmentId,
    amount,
    paymentMethod,
    transactionReference,
    status: "completed",
  });

  return payment;
};

// Get investment requests for startup
exports.getStartupInvestmentRequests = async (startupId) => {
  const requests = await investmentRequestModel.findByStartupId(startupId);
  return requests;
};

// Get investment requests for investor
exports.getInvestorInvestmentRequests = async (investorId) => {
  const requests = await investmentRequestModel.findByInvestorId(investorId);
  return requests;
};

// Get investments for investor
exports.getInvestorInvestments = async (investorId) => {
  const investments = await investmentModel.findByInvestorId(investorId);
  return investments;
};

// Get investments in startup
exports.getStartupInvestments = async (startupId) => {
  const investments = await investmentModel.findByStartupId(startupId);
  return investments;
};

// Get payments for investment
exports.getInvestmentPayments = async (investmentId) => {
  const payments = await paymentModel.findByInvestmentId(investmentId);
  return payments;
};

// Calculate total investment
exports.getStartupTotalInvestment = async (startupId) => {
  const investments = await investmentModel.findByStartupId(startupId);
  const total = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  return total;
};

// Calculate investor portfolio
exports.getInvestorPortfolioValue = async (investorId) => {
  const investments = await investmentModel.findByInvestorId(investorId);
  const total = investments.reduce((sum, inv) => sum + (inv.amount || 0), 0);
  return total;
};
