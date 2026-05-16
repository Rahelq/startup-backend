const paymentModel = require("../models/paymentModel");
const investmentModel = require("../models/investmentModel");

// Create payment (for Chapa integration or other payment methods)
exports.createPayment = async (
  investmentId,
  amount,
  paymentMethod,
  transactionReference,
  notes
) => {
  const investment = await investmentModel.findById(investmentId);
  if (!investment) {
    throw { status: 404, message: "Investment not found" };
  }

  if (amount > investment.amount) {
    throw { status: 400, message: "Payment amount exceeds investment amount" };
  }

  const payment = await paymentModel.create({
    investmentId,
    amount,
    paymentMethod,
    transactionReference,
    status: "completed",
    notes,
  });

  return payment;
};

// Get payment by ID
exports.getPaymentById = async (paymentId) => {
  const payment = await paymentModel.findById(paymentId);
  if (!payment) {
    throw { status: 404, message: "Payment not found" };
  }
  return payment;
};

// Get all payments for investment
exports.getInvestmentPayments = async (investmentId) => {
  const payments = await paymentModel.findByInvestmentId(investmentId);
  return payments;
};

// Get all payments by investor
exports.getInvestorPayments = async (investorId) => {
  const payments = await paymentModel.findByInvestorId(investorId);
  return payments;
};

// Calculate total paid for investment
exports.getTotalPaidForInvestment = async (investmentId) => {
  const payments = await paymentModel.findByInvestmentId(investmentId);
  const total = payments.reduce((sum, payment) => {
    return payment.status === "completed" ? sum + (payment.amount || 0) : sum;
  }, 0);
  return total;
};

// Get payment status summary
exports.getPaymentSummaryByInvestor = async (investorId) => {
  const payments = await paymentModel.findByInvestorId(investorId);

  const summary = {
    totalPayments: payments.length,
    totalAmount: 0,
    completedAmount: 0,
    pendingAmount: 0,
    failedAmount: 0,
    byStatus: {
      completed: [],
      pending: [],
      failed: [],
    },
  };

  payments.forEach((payment) => {
    summary.totalAmount += payment.amount || 0;

    if (payment.status === "completed") {
      summary.completedAmount += payment.amount || 0;
      summary.byStatus.completed.push(payment);
    } else if (payment.status === "pending") {
      summary.pendingAmount += payment.amount || 0;
      summary.byStatus.pending.push(payment);
    } else if (payment.status === "failed") {
      summary.failedAmount += payment.amount || 0;
      summary.byStatus.failed.push(payment);
    }
  });

  return summary;
};

// Update payment status (for webhook callbacks)
exports.updatePaymentStatus = async (paymentId, status) => {
  const payment = await paymentModel.update(paymentId, { status });
  if (!payment) {
    throw { status: 404, message: "Payment not found" };
  }
  return payment;
};
