const transactionService = require("../services/transactionService");
const financialAuditLogModel = require("../models/financialAuditLogModel");
const invoiceModel = require("../models/invoiceModel");

exports.initializePayment = async (req, res) => {
  try {
    const result = await transactionService.initializePayment({
      userId: req.user.user_id,
      body: req.body || {},
    });
    return res.status(201).json({
      message: "Transaction checkout initialized",
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.verifyPayment = async (req, res) => {
  try {
    const txRef = req.params.txRef || req.body.tx_ref;
    const result = await transactionService.verifyAndFinalizePayment({
      txRef,
      actorUserId: req.user.user_id,
      source: "manual",
    });
    return res.json({
      message: "Payment verification processed",
      ...result,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.handleChapaWebhook = async (req, res) => {
  try {
    const result = await transactionService.handleChapaWebhook({ req });
    return res.json({ message: "Webhook synchronized", ...result });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.listMyTransactions = async (req, res) => {
  try {
    const transactions = await transactionService.listTransactionHistory({
      userId: req.user.user_id,
      status: req.query.status || null,
      paymentType: req.query.payment_type || null,
      limit: req.query.limit || 50,
    });
    return res.json({ transactions });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.getTransactionById = async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      return res.status(400).json({ error: "Invalid payment id" });
    }

    const payment = await transactionService.getPaymentByIdForUser({
      paymentId,
      userId: req.user.user_id,
    });
    if (!payment) return res.status(404).json({ error: "Payment not found" });

    const audit_logs = await financialAuditLogModel.listByPayment(paymentId);
    const invoice = await invoiceModel.findByPaymentId(paymentId);

    return res.json({ payment, invoice, audit_logs });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.requestRefund = async (req, res) => {
  try {
    const paymentId = Number(req.params.paymentId);
    const refund = await transactionService.requestRefund({
      paymentId,
      requesterId: req.user.user_id,
      amount: req.body.amount,
      reason: req.body.reason,
    });

    return res.status(201).json({
      message: "Refund request submitted",
      refund,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.decideRefund = async (req, res) => {
  try {
    const refundId = Number(req.params.refundId);
    if (!Number.isInteger(refundId) || refundId <= 0) {
      return res.status(400).json({ error: "Invalid refund id" });
    }

    const refund = await transactionService.approveRefund({
      refundId,
      adminUserId: req.user.user_id,
      approve: req.body.approve,
      notes: req.body.notes,
    });

    return res.json({
      message: req.body.approve ? "Refund approved" : "Refund rejected",
      refund,
    });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.getMentorEarnings = async (req, res) => {
  try {
    const earnings = await transactionService.getMentorEarnings({ userId: req.user.user_id });
    return res.json({ earnings });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.getInvestorFundingAnalytics = async (req, res) => {
  try {
    const analytics = await transactionService.getInvestorFundingAnalytics({
      userId: req.user.user_id,
    });
    return res.json({ analytics });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};

exports.getPlatformRevenue = async (req, res) => {
  try {
    const revenue = await transactionService.getPlatformRevenue({
      from: req.query.from || null,
      to: req.query.to || null,
    });
    return res.json({ revenue });
  } catch (error) {
    return res.status(error.status || 500).json({ error: error.message });
  }
};
