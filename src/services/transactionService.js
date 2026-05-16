const crypto = require("crypto");
const pool = require("../config/db");
const chapaPaymentService = require("./chapaPaymentService");
const notificationService = require("./notificationService");
const realtimeEmitter = require("../utils/realtimeEmitter");
const { calculateFeeBreakdown } = require("../utils/paymentFees");
const { generateTxRef, generateInvoiceNumber } = require("../utils/txRef");
const receiptService = require("./receiptService");
const financialAuditLogModel = require("../models/financialAuditLogModel");
const investmentTransactionModel = require("../models/investmentTransactionModel");
const invoiceModel = require("../models/invoiceModel");

function normalizeStatus(raw) {
  return String(raw || "").toLowerCase();
}

function chapaSucceeded(rawStatus) {
  const status = normalizeStatus(rawStatus);
  return status.includes("success") || status.includes("complete") || status.includes("paid");
}

function chapaFailed(rawStatus) {
  const status = normalizeStatus(rawStatus);
  return status.includes("fail") || status.includes("cancel") || status.includes("error");
}

function computeWebhookHash({ txRef, signature, payload }) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify({ txRef: txRef || null, signature: signature || null, payload }))
    .digest("hex");
}

function normalizeGatewayEmail(email) {
  const raw = String(email || "")
    .trim()
    .toLowerCase();
  const basicEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!basicEmailPattern.test(raw)) {
    return process.env.CHAPA_TEST_EMAIL || "john.doe@gmail.com";
  }

  const domain = raw.split("@")[1] || "";
  if (["test", "localhost", "local"].some((bad) => domain.endsWith(`.${bad}`) || domain === bad)) {
    return process.env.CHAPA_TEST_EMAIL || "john.doe@gmail.com";
  }

  return raw;
}

async function getUserProfile(client, userId) {
  const result = await client.query(
    `SELECT user_id, first_name, last_name, email FROM users WHERE user_id = $1`,
    [userId]
  );
  return result.rows[0] || null;
}

async function validateRelationship(client, { paymentType, relationshipId, payerId }) {
  if (!relationshipId) {
    throw Object.assign(new Error("relationship_id is required"), { status: 400 });
  }

  if (["mentorship_session", "mentorship_plan", "consultation"].includes(paymentType)) {
    const result = await client.query(
      `SELECT mentorship_id, mentor_id, startup_id, status
       FROM mentorship_relationships
       WHERE mentorship_id = $1`,
      [relationshipId]
    );
    if (!result.rowCount)
      throw Object.assign(new Error("Mentorship relationship not found"), { status: 404 });
    const rel = result.rows[0];
    if (rel.status !== "active")
      throw Object.assign(new Error("Mentorship relationship is not active"), { status: 403 });
    if (![rel.mentor_id, rel.startup_id].includes(payerId)) {
      throw Object.assign(new Error("User is not part of this mentorship relationship"), {
        status: 403,
      });
    }
    return {
      relationship_type: "mentorship",
      relationship_id: rel.mentorship_id,
      payer_id: payerId,
      receiver_id: payerId === rel.mentor_id ? rel.startup_id : rel.mentor_id,
      mentor_id: rel.mentor_id,
      startup_id: rel.startup_id,
    };
  }

  if (["investment_funding", "milestone_release", "platform_fee"].includes(paymentType)) {
    const result = await client.query(
      `SELECT investment_id, investor_id, startup_id, status
       FROM investment_relationships
       WHERE investment_id = $1`,
      [relationshipId]
    );
    if (!result.rowCount)
      throw Object.assign(new Error("Investment relationship not found"), { status: 404 });
    const rel = result.rows[0];
    if (!["active", "accepted", "countered", "completed"].includes(rel.status)) {
      throw Object.assign(new Error("Investment relationship is not active"), { status: 403 });
    }
    if (![rel.investor_id, rel.startup_id].includes(payerId)) {
      throw Object.assign(new Error("User is not part of this investment relationship"), {
        status: 403,
      });
    }
    return {
      relationship_type: "investment",
      relationship_id: rel.investment_id,
      payer_id: payerId,
      receiver_id: payerId === rel.investor_id ? rel.startup_id : rel.investor_id,
      investor_id: rel.investor_id,
      startup_id: rel.startup_id,
    };
  }

  throw Object.assign(new Error("Unsupported payment_type"), { status: 400 });
}

async function assertReferenceOwnership(
  client,
  { paymentType, sessionId, proposalId, investmentOfferId, fundingRequestId, relationship }
) {
  if (paymentType === "mentorship_session" && sessionId) {
    const result = await client.query(
      `SELECT mentorship_session_id
       FROM mentorship_sessions
       WHERE mentorship_session_id = $1 AND mentorship_id = $2`,
      [sessionId, relationship.relationship_id]
    );
    if (!result.rowCount) {
      throw Object.assign(new Error("Session does not belong to mentorship relationship"), {
        status: 400,
      });
    }
  }

  if (paymentType === "mentorship_plan" && proposalId) {
    const result = await client.query(
      `SELECT mentorship_proposal_id
       FROM mentorship_proposals
       WHERE mentorship_proposal_id = $1 AND mentorship_id = $2`,
      [proposalId, relationship.relationship_id]
    );
    if (!result.rowCount) {
      throw Object.assign(new Error("Proposal does not belong to mentorship relationship"), {
        status: 400,
      });
    }
  }

  if (["investment_funding", "milestone_release"].includes(paymentType) && fundingRequestId) {
    const result = await client.query(
      `SELECT funding_request_id
       FROM funding_requests
       WHERE funding_request_id = $1 AND investment_id = $2`,
      [fundingRequestId, relationship.relationship_id]
    );
    if (!result.rowCount) {
      throw Object.assign(new Error("Funding request does not belong to investment relationship"), {
        status: 400,
      });
    }
  }

  if (["investment_funding", "milestone_release"].includes(paymentType) && investmentOfferId) {
    const result = await client.query(
      `SELECT investment_offer_id
       FROM investment_offers
       WHERE investment_offer_id = $1 AND investment_id = $2`,
      [investmentOfferId, relationship.relationship_id]
    );
    if (!result.rowCount) {
      throw Object.assign(
        new Error("Investment offer does not belong to investment relationship"),
        { status: 400 }
      );
    }
  }
}

async function assertNoDuplicatePending(
  client,
  { payerId, paymentType, relationshipType, relationshipId, amount, fundingRequestId, sessionId }
) {
  const result = await client.query(
    `SELECT payment_id
     FROM payments
     WHERE payer_id = $1
       AND payment_type = $2
       AND relationship_type = $3
       AND relationship_id = $4
       AND amount = $5
       AND COALESCE(funding_request_id, 0) = COALESCE($6, 0)
       AND COALESCE(session_id, 0) = COALESCE($7, 0)
       AND status IN ('pending', 'processing')
     LIMIT 1`,
    [
      payerId,
      paymentType,
      relationshipType,
      relationshipId,
      amount,
      fundingRequestId || null,
      sessionId || null,
    ]
  );

  if (result.rowCount) {
    throw Object.assign(new Error("A similar pending payment already exists"), { status: 409 });
  }
}

async function initializePayment({ userId, body }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const paymentType = body.payment_type;
    const amount = Number(body.amount);
    const currency = body.currency || "ETB";

    const relationship = await validateRelationship(client, {
      paymentType,
      relationshipId: Number(body.relationship_id),
      payerId: Number(userId),
    });

    await assertReferenceOwnership(client, {
      paymentType,
      sessionId: body.session_id ? Number(body.session_id) : null,
      proposalId: body.proposal_id ? Number(body.proposal_id) : null,
      investmentOfferId: body.investment_offer_id ? Number(body.investment_offer_id) : null,
      fundingRequestId: body.funding_request_id ? Number(body.funding_request_id) : null,
      relationship,
    });

    const fee = calculateFeeBreakdown(amount, paymentType);
    await assertNoDuplicatePending(client, {
      payerId: relationship.payer_id,
      paymentType,
      relationshipType: relationship.relationship_type,
      relationshipId: relationship.relationship_id,
      amount: fee.amount,
      fundingRequestId: body.funding_request_id,
      sessionId: body.session_id,
    });

    const payer = await getUserProfile(client, relationship.payer_id);
    if (!payer) throw Object.assign(new Error("Payer profile not found"), { status: 404 });

    const txRef = generateTxRef(paymentType);
    const idempotencyKey = String(body.idempotency_key || txRef);

    const checkout = await chapaPaymentService.initializePayment(
      chapaPaymentService.buildChapaPayload({
        amount: fee.amount,
        currency,
        txRef,
        email: normalizeGatewayEmail(payer.email),
        firstName: payer.first_name,
        lastName: payer.last_name,
        title: "StartupConnect",
        description: body.description || `${paymentType.replace(/_/g, " ")} payment`,
        callbackUrl: body.callback_url || null,
        returnUrl: body.return_url || null,
        metadata: {
          relationship_type: relationship.relationship_type,
          relationship_id: relationship.relationship_id,
          payment_type: paymentType,
          payer_id: relationship.payer_id,
          receiver_id: relationship.receiver_id,
          payer_email: payer.email,
        },
      })
    );

    if (!checkout.checkout_url) {
      throw Object.assign(new Error("Payment provider did not return checkout URL"), {
        status: 502,
      });
    }

    const insert = await client.query(
      `INSERT INTO payments (
        payer_id,
        receiver_id,
        from_user_id,
        to_user_id,
        relationship_type,
        relationship_id,
        session_id,
        proposal_id,
        investment_offer_id,
        funding_request_id,
        payment_type,
        reference_type,
        reference_id,
        amount,
        platform_fee,
        receiver_amount,
        currency,
        transaction_reference,
        chapa_tx_ref,
        gateway_tx_ref,
        payment_provider,
        payment_method,
        status,
        description,
        checkout_url,
        idempotency_key,
        metadata,
        updated_at
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
        $11,$12,$13,$14,$15,$16,$17,$18,$19,$20,
        $21,$22,$23,$24,$25,$26,$27::jsonb,NOW()
      ) RETURNING *`,
      [
        relationship.payer_id,
        relationship.receiver_id,
        relationship.payer_id,
        relationship.receiver_id,
        relationship.relationship_type,
        relationship.relationship_id,
        body.session_id || null,
        body.proposal_id || null,
        body.investment_offer_id || null,
        body.funding_request_id || null,
        paymentType,
        body.reference_type || paymentType,
        body.reference_id || relationship.relationship_id,
        fee.amount,
        fee.platform_fee,
        fee.receiver_amount,
        currency,
        txRef,
        txRef,
        txRef,
        "chapa",
        body.payment_method || "chapa",
        "pending",
        body.description || null,
        checkout.checkout_url,
        idempotencyKey,
        JSON.stringify({
          fee_rate: fee.rate,
          gateway_initialize: checkout.raw,
          mode: "phase5",
        }),
      ]
    );

    const payment = insert.rows[0];

    await financialAuditLogModel.create(
      {
        paymentId: payment.payment_id,
        action: "payment_initialized",
        performedBy: userId,
        oldStatus: null,
        newStatus: "pending",
        notes: "Chapa checkout initialized",
      },
      client
    );

    if (["investment_funding", "milestone_release"].includes(paymentType)) {
      await investmentTransactionModel.create(
        {
          relationship_id: relationship.relationship_id,
          investor_id: relationship.investor_id,
          startup_id: relationship.startup_id,
          offer_id: body.investment_offer_id || null,
          funding_request_id: body.funding_request_id || null,
          payment_id: payment.payment_id,
          amount: fee.amount,
          equity_percentage: body.equity_percentage || null,
          transaction_stage:
            paymentType === "milestone_release" ? "milestone_release" : "funding_payment",
          milestone_reference: body.milestone_reference || null,
          status: "committed",
          notes: body.description || null,
        },
        client
      );
    }

    await notificationService.createNotification({
      userId: relationship.receiver_id,
      notificationType: "payment_pending",
      title: "Payment initiated",
      message: `A ${paymentType.replace(/_/g, " ")} payment is pending verification.`,
      referenceType: "payments",
      referenceId: payment.payment_id,
      metadata: {
        amount: payment.amount,
        currency: payment.currency,
      },
    });

    await client.query("COMMIT");

    realtimeEmitter.emitPaymentInitiated(relationship.payer_id, {
      payment_id: payment.payment_id,
      reference_type: payment.reference_type,
      reference_id: payment.reference_id,
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.payment_method,
      status: payment.status,
      checkout_url: payment.checkout_url,
      tx_ref: payment.chapa_tx_ref,
    });

    return {
      payment,
      checkout_url: payment.checkout_url,
      tx_ref: payment.chapa_tx_ref,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function verifyAndFinalizePayment({
  txRef,
  actorUserId = null,
  source = "manual",
  webhookPayload = null,
}) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const paymentResult = await client.query(
      `SELECT *
       FROM payments
       WHERE COALESCE(chapa_tx_ref::text, '') = $1::text
         OR COALESCE(gateway_tx_ref::text, '') = $1::text
         OR COALESCE(transaction_reference::text, '') = $1::text
       LIMIT 1`,
      [txRef]
    );

    if (!paymentResult.rowCount) {
      throw Object.assign(new Error("Payment not found"), { status: 404 });
    }

    const payment = paymentResult.rows[0];
    if (["completed", "refunded"].includes(payment.status)) {
      await client.query("COMMIT");
      return { payment, gateway: null, already_finalized: true };
    }

    const gateway = await chapaPaymentService.verifyPayment(payment.chapa_tx_ref || txRef);
    const gatewayStatus = gateway?.data?.status || gateway?.status || gateway?.message || "unknown";

    let nextStatus = payment.status;
    if (chapaSucceeded(gatewayStatus)) nextStatus = "completed";
    else if (chapaFailed(gatewayStatus)) nextStatus = "failed";
    else nextStatus = "processing";

    const isCompleted = nextStatus === "completed";
    const isTerminal = nextStatus === "completed" || nextStatus === "failed";

    const updatedResult = await client.query(
      `UPDATE payments
       SET status = $1,
           paid_at = CASE WHEN $2 THEN COALESCE(paid_at, NOW()) ELSE paid_at END,
           verified_at = CASE WHEN $3 THEN NOW() ELSE verified_at END,
           metadata = COALESCE(metadata, '{}'::jsonb) || $4::jsonb,
           updated_at = NOW()
       WHERE payment_id = $5
       RETURNING *`,
      [
        nextStatus,
        isCompleted,
        isTerminal,
        JSON.stringify({
          verification_source: source,
          webhook_payload: webhookPayload,
          gateway_verify: gateway,
        }),
        payment.payment_id,
      ]
    );

    const updated = updatedResult.rows[0];

    await financialAuditLogModel.create(
      {
        paymentId: updated.payment_id,
        action: "payment_status_updated",
        performedBy: actorUserId,
        oldStatus: payment.status,
        newStatus: updated.status,
        notes: `${source} verification`,
      },
      client
    );

    if (updated.status === "completed") {
      const receipt = await receiptService.generateReceiptDocument({
        receipt_type: "payment",
        payment_id: updated.payment_id,
        payer_id: updated.payer_id,
        receiver_id: updated.receiver_id,
        amount: updated.amount,
        platform_fee: updated.platform_fee,
        receiver_amount: updated.receiver_amount,
        currency: updated.currency,
        transaction_reference: updated.transaction_reference,
        payment_method: updated.payment_method,
        paid_at: updated.paid_at || new Date().toISOString(),
      });

      let invoice = await invoiceModel.findByPaymentId(updated.payment_id);
      if (!invoice) {
        invoice = await invoiceModel.create(
          {
            payment_id: updated.payment_id,
            invoice_number: generateInvoiceNumber(),
            issued_to: updated.payer_id,
            issued_by: updated.receiver_id,
            amount: updated.amount,
            platform_fee: updated.platform_fee,
            net_amount: updated.receiver_amount,
            currency: updated.currency,
            status: "paid",
            document_url: receipt.url,
            metadata: {
              receipt_provider: receipt.provider,
              receipt_payload: receipt.metadata,
            },
          },
          client
        );
      }

      await client.query(
        `UPDATE payments
         SET receipt_url = COALESCE(receipt_url, $1),
             invoice_number = COALESCE(invoice_number, $2),
             metadata = COALESCE(metadata, '{}'::jsonb) || $3::jsonb,
             updated_at = NOW()
         WHERE payment_id = $4`,
        [
          receipt.url,
          invoice.invoice_number,
          JSON.stringify({
            receipt: receipt.metadata,
            receipt_provider: receipt.provider,
          }),
          updated.payment_id,
        ]
      );

      await client.query(
        `INSERT INTO platform_ledger_entries (payment_id, entry_type, amount, currency, notes, metadata)
         VALUES ($1, 'platform_fee', $2, $3, $4, $5::jsonb)`,
        [
          updated.payment_id,
          updated.platform_fee,
          updated.currency,
          "Fee booked on successful payment",
          JSON.stringify({ payment_type: updated.payment_type }),
        ]
      );

      await notificationService.createNotification({
        userId: updated.receiver_id,
        notificationType: "payment_completed",
        title: "Payment completed",
        message: `Payment ${updated.payment_id} completed successfully.`,
        referenceType: "payments",
        referenceId: updated.payment_id,
      });
    }

    await client.query("COMMIT");

    if (updated.status === "completed") {
      realtimeEmitter.emitPaymentCompleted([updated.payer_id, updated.receiver_id], {
        payment_id: updated.payment_id,
        reference_type: updated.reference_type,
        reference_id: updated.reference_id,
        amount: updated.amount,
        currency: updated.currency,
        payment_method: updated.payment_method,
        status: updated.status,
        tx_ref: updated.chapa_tx_ref,
        verified_at: updated.verified_at,
      });
    }

    if (updated.status === "failed") {
      realtimeEmitter.emitPaymentFailed(updated.payer_id, {
        payment_id: updated.payment_id,
        reference_type: updated.reference_type,
        reference_id: updated.reference_id,
        amount: updated.amount,
        currency: updated.currency,
        payment_method: updated.payment_method,
        status: updated.status,
        tx_ref: updated.chapa_tx_ref,
      });
    }

    return {
      payment: updated,
      gateway,
      already_finalized: false,
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function handleChapaWebhook({ req }) {
  if (!chapaPaymentService.verifyWebhookSignature(req)) {
    throw Object.assign(new Error("Invalid webhook signature"), { status: 401 });
  }

  const txRef =
    req.body?.tx_ref || req.body?.txRef || req.body?.data?.tx_ref || req.body?.data?.txRef || null;

  if (!txRef) {
    throw Object.assign(new Error("tx_ref is required"), { status: 400 });
  }

  const signature =
    req.headers["x-chapa-signature"] ||
    req.headers["x-chapa-hash"] ||
    req.headers["verif-hash"] ||
    null;

  const eventHash = computeWebhookHash({ txRef, signature, payload: req.body || {} });

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const exists = await client.query(
      `SELECT id, processed FROM payment_webhook_events WHERE event_hash = $1 LIMIT 1`,
      [eventHash]
    );

    if (exists.rowCount) {
      await client.query("COMMIT");
      return { duplicate: true, tx_ref: txRef };
    }

    await client.query(
      `INSERT INTO payment_webhook_events (provider, tx_ref, event_hash, signature, payload, processed, processed_at)
       VALUES ('chapa', $1, $2, $3, $4::jsonb, FALSE, NULL)`,
      [txRef, eventHash, signature, JSON.stringify(req.body || {})]
    );

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }

  const result = await verifyAndFinalizePayment({
    txRef,
    actorUserId: null,
    source: "webhook",
    webhookPayload: req.body || {},
  });

  await pool.query(
    `UPDATE payment_webhook_events SET processed = TRUE, processed_at = NOW() WHERE event_hash = $1`,
    [eventHash]
  );

  return {
    duplicate: false,
    ...result,
  };
}

async function listTransactionHistory({ userId, limit = 50, status = null, paymentType = null }) {
  const params = [userId];
  let idx = 2;
  let where = `WHERE (payer_id = $1 OR receiver_id = $1 OR from_user_id = $1 OR to_user_id = $1)`;

  if (status) {
    where += ` AND status = $${idx++}`;
    params.push(status);
  }
  if (paymentType) {
    where += ` AND payment_type = $${idx++}`;
    params.push(paymentType);
  }
  where += ` ORDER BY created_at DESC LIMIT $${idx}`;
  params.push(Number(limit) || 50);

  const result = await pool.query(`SELECT * FROM payments ${where}`, params);
  return result.rows;
}

async function getPaymentByIdForUser({ paymentId, userId }) {
  const result = await pool.query(
    `SELECT *
     FROM payments
     WHERE payment_id = $1
       AND (payer_id = $2 OR receiver_id = $2 OR from_user_id = $2 OR to_user_id = $2)
     LIMIT 1`,
    [paymentId, userId]
  );
  return result.rows[0] || null;
}

async function requestRefund({ paymentId, requesterId, amount, reason }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const pResult = await client.query(`SELECT * FROM payments WHERE payment_id = $1 FOR UPDATE`, [
      paymentId,
    ]);
    if (!pResult.rowCount) throw Object.assign(new Error("Payment not found"), { status: 404 });

    const payment = pResult.rows[0];
    if (payment.status !== "completed") {
      throw Object.assign(new Error("Only completed payments can be refunded"), { status: 400 });
    }

    if (![payment.payer_id, payment.receiver_id].includes(Number(requesterId))) {
      throw Object.assign(new Error("No permission to request refund for this payment"), {
        status: 403,
      });
    }

    const refundAmount = Number(amount || payment.amount);
    const alreadyRefunded = Number(payment.refunded_amount || 0);
    const maxRefundable = Number(payment.amount) - alreadyRefunded;
    if (!Number.isFinite(refundAmount) || refundAmount <= 0 || refundAmount > maxRefundable) {
      throw Object.assign(new Error("Invalid refund amount"), { status: 400 });
    }

    const created = await client.query(
      `INSERT INTO payment_refunds (payment_id, requested_by, amount, reason, status)
       VALUES ($1,$2,$3,$4,'requested')
       RETURNING *`,
      [paymentId, requesterId, refundAmount, reason || null]
    );

    await financialAuditLogModel.create(
      {
        paymentId,
        action: "refund_requested",
        performedBy: requesterId,
        oldStatus: payment.status,
        newStatus: payment.status,
        notes: `refund amount ${refundAmount}`,
      },
      client
    );

    await client.query("COMMIT");
    return created.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function approveRefund({ refundId, adminUserId, approve, notes }) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const refundResult = await client.query(
      `SELECT r.*, p.status AS payment_status, p.amount AS payment_amount, p.refunded_amount, p.currency
       FROM payment_refunds r
       JOIN payments p ON p.payment_id = r.payment_id
       WHERE r.id = $1
       FOR UPDATE`,
      [refundId]
    );

    if (!refundResult.rowCount)
      throw Object.assign(new Error("Refund request not found"), { status: 404 });
    const refund = refundResult.rows[0];

    if (refund.status !== "requested") {
      throw Object.assign(new Error("Refund request already processed"), { status: 400 });
    }

    if (!approve) {
      const rejected = await client.query(
        `UPDATE payment_refunds
         SET status = 'rejected', approved_by = $2, updated_at = NOW(), metadata = metadata || $3::jsonb
         WHERE id = $1
         RETURNING *`,
        [refundId, adminUserId, JSON.stringify({ notes: notes || null })]
      );
      await client.query("COMMIT");
      return rejected.rows[0];
    }

    const updatedRefund = await client.query(
      `UPDATE payment_refunds
       SET status = 'processed', approved_by = $2, updated_at = NOW(), metadata = metadata || $3::jsonb
       WHERE id = $1
       RETURNING *`,
      [
        refundId,
        adminUserId,
        JSON.stringify({ notes: notes || null, processed_at: new Date().toISOString() }),
      ]
    );

    const newRefunded = Number(refund.refunded_amount || 0) + Number(refund.amount);
    const fullyRefunded = newRefunded >= Number(refund.payment_amount);

    const paymentUpdate = await client.query(
      `UPDATE payments
       SET refunded_amount = $2,
           refunded_at = NOW(),
           status = CASE WHEN $3 THEN 'refunded' ELSE status END,
           updated_at = NOW()
       WHERE payment_id = $1
       RETURNING *`,
      [refund.payment_id, newRefunded, fullyRefunded]
    );

    await client.query(
      `INSERT INTO platform_ledger_entries (payment_id, entry_type, amount, currency, notes, metadata)
       VALUES ($1, 'refund', $2, $3, $4, $5::jsonb)`,
      [
        refund.payment_id,
        Number(refund.amount) * -1,
        refund.currency || "ETB",
        "Refund processed",
        JSON.stringify({ refund_id: refund.id, approved_by: adminUserId }),
      ]
    );

    await financialAuditLogModel.create(
      {
        paymentId: refund.payment_id,
        action: "refund_processed",
        performedBy: adminUserId,
        oldStatus: refund.payment_status,
        newStatus: paymentUpdate.rows[0].status,
        notes: notes || "Admin approved refund",
      },
      client
    );

    await client.query("COMMIT");
    return updatedRefund.rows[0];
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function getMentorEarnings({ userId }) {
  const result = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'completed' THEN receiver_amount ELSE 0 END), 0) AS completed_earnings,
      COALESCE(SUM(CASE WHEN status IN ('pending', 'processing') THEN receiver_amount ELSE 0 END), 0) AS pending_earnings,
      COALESCE(SUM(CASE WHEN status = 'refunded' THEN refunded_amount ELSE 0 END), 0) AS refunded_amount,
      COALESCE(SUM(platform_fee), 0) AS platform_deductions,
      COUNT(*)::int AS total_transactions
     FROM payments
     WHERE receiver_id = $1
       AND payment_type IN ('mentorship_session', 'mentorship_plan', 'consultation')`,
    [userId]
  );
  return result.rows[0];
}

async function getInvestorFundingAnalytics({ userId }) {
  const totals = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status IN ('completed', 'refunded') THEN amount ELSE 0 END), 0) AS total_invested,
      COALESCE(SUM(CASE WHEN status IN ('pending', 'processing') THEN amount ELSE 0 END), 0) AS active_commitments,
      COALESCE(SUM(CASE WHEN payment_type = 'milestone_release' AND status = 'completed' THEN amount ELSE 0 END), 0) AS released_milestones,
      COUNT(*)::int AS total_transactions
     FROM payments
     WHERE payer_id = $1
       AND payment_type IN ('investment_funding', 'milestone_release')`,
    [userId]
  );

  const milestones = await pool.query(
    `SELECT id, relationship_id, funding_request_id, amount, milestone_reference, status, created_at
     FROM investment_transactions
     WHERE investor_id = $1
     ORDER BY created_at DESC
     LIMIT 50`,
    [userId]
  );

  return {
    summary: totals.rows[0],
    milestone_history: milestones.rows,
  };
}

async function getPlatformRevenue({ from = null, to = null }) {
  const params = [];
  let where = "";
  if (from || to) {
    where = "WHERE 1=1";
    if (from) {
      params.push(from);
      where += ` AND created_at >= $${params.length}`;
    }
    if (to) {
      params.push(to);
      where += ` AND created_at <= $${params.length}`;
    }
  }

  const revenue = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN entry_type = 'platform_fee' THEN amount ELSE 0 END), 0) AS total_fees_collected,
      COALESCE(SUM(CASE WHEN entry_type = 'refund' THEN amount ELSE 0 END), 0) AS refunds_total,
      COALESCE(SUM(amount), 0) AS net_revenue,
      COUNT(*)::int AS ledger_entries
     FROM platform_ledger_entries ${where}`,
    params
  );

  const successRate = await pool.query(
    `SELECT
      COUNT(*) FILTER (WHERE status = 'completed')::decimal AS success_count,
      COUNT(*)::decimal AS total_count
     FROM payments ${where}`,
    params
  );

  const countRow = successRate.rows[0];
  const successCount = Number(countRow.success_count || 0);
  const totalCount = Number(countRow.total_count || 0);
  const paymentSuccessRate = totalCount
    ? Number(((successCount / totalCount) * 100).toFixed(2))
    : 0;

  return {
    ...revenue.rows[0],
    payment_success_rate: paymentSuccessRate,
  };
}

module.exports = {
  initializePayment,
  verifyAndFinalizePayment,
  handleChapaWebhook,
  listTransactionHistory,
  getPaymentByIdForUser,
  requestRefund,
  approveRefund,
  getMentorEarnings,
  getInvestorFundingAnalytics,
  getPlatformRevenue,
};
