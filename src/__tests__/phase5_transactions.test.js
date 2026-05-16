const { calculateFeeBreakdown, getFeeRate, PLATFORM_FEES } = require("../utils/paymentFees");
const { generateTxRef, generateInvoiceNumber } = require("../utils/txRef");
const { initializeTransactionPaymentSchema } = require("../validations/transaction");

describe("Phase 5 Transaction Helpers", () => {
  it("calculates mentorship platform fee at 2%", () => {
    const result = calculateFeeBreakdown(1000, "mentorship_session");
    expect(result.platform_fee).toBe(20);
    expect(result.receiver_amount).toBe(980);
  });

  it("calculates investment platform fee at 5%", () => {
    const result = calculateFeeBreakdown(1000, "investment_funding");
    expect(result.platform_fee).toBe(50);
    expect(result.receiver_amount).toBe(950);
  });

  it("uses zero fee for unknown or zero-fee types", () => {
    expect(getFeeRate("subscription")).toBe(0);
    expect(getFeeRate("unknown_type")).toBe(0);
  });

  it("generates unique transaction references", () => {
    const a = generateTxRef("mentorship_session");
    const b = generateTxRef("mentorship_session");
    expect(a).not.toEqual(b);
    expect(a).toMatch(/^mentorship_/);
  });

  it("generates invoice numbers", () => {
    const invoice = generateInvoiceNumber();
    expect(invoice).toMatch(/^INV-\d{8}-[A-Z0-9]+$/);
  });

  it("validates transaction initialize payload", () => {
    const { error } = initializeTransactionPaymentSchema.validate({
      relationship_id: 1,
      payment_type: "milestone_release",
      amount: 25000,
      currency: "ETB",
      funding_request_id: 3,
      milestone_reference: "beta-launch",
    });

    expect(error).toBeUndefined();
  });

  it("rejects invalid payment type", () => {
    const { error } = initializeTransactionPaymentSchema.validate({
      relationship_id: 1,
      payment_type: "wrong",
      amount: 100,
    });

    expect(error).toBeDefined();
  });

  it("exposes configured fee map keys", () => {
    expect(PLATFORM_FEES).toHaveProperty("mentorship_session");
    expect(PLATFORM_FEES).toHaveProperty("investment_funding");
    expect(PLATFORM_FEES).toHaveProperty("milestone_release");
  });
});
