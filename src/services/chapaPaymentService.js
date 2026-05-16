const axios = require("axios");
const crypto = require("crypto");

function getConfig() {
  const secretKey = process.env.CHAPA_SECRET_KEY || process.env.CHAPA_API_KEY || "";
  if (!secretKey) {
    throw new Error("CHAPA_SECRET_KEY is not configured");
  }

  return {
    baseUrl: process.env.CHAPA_BASE_URL || "https://api.chapa.co/v1",
    secretKey,
    webhookSecret: process.env.CHAPA_WEBHOOK_SECRET || secretKey,
    callbackUrl: process.env.CHAPA_CALLBACK_URL || null,
    returnUrl: process.env.CHAPA_RETURN_URL || null,
  };
}

function generateTxRef(prefix = "payment") {
  const safePrefix = String(prefix || "payment")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 10);
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  return `${safePrefix || "payment"}_${stamp}_${rand}`.slice(0, 50);
}

function normalizeCheckoutResponse(responseData) {
  const data = responseData && responseData.data ? responseData.data : responseData || {};
  return {
    raw: responseData,
    checkout_url:
      data.checkout_url ||
      data.data?.checkout_url ||
      data.payment_url ||
      data.data?.payment_url ||
      null,
    tx_ref: data.tx_ref || data.data?.tx_ref || null,
    status: data.status || data.data?.status || null,
  };
}

async function initializePayment(payload) {
  const config = getConfig();
  try {
    const response = await axios.post(`${config.baseUrl}/transaction/initialize`, payload, {
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
        "Content-Type": "application/json",
      },
    });

    return normalizeCheckoutResponse(response.data);
  } catch (error) {
    const gatewayData = error?.response?.data;
    const message = gatewayData
      ? `Chapa initialize failed: ${JSON.stringify(gatewayData)}`
      : `Chapa initialize failed: ${error.message}`;
    const wrapped = new Error(message);
    wrapped.status = error?.response?.status || 502;
    wrapped.gateway = gatewayData || null;
    throw wrapped;
  }
}

async function verifyPayment(txRef) {
  const config = getConfig();
  const response = await axios.get(
    `${config.baseUrl}/transaction/verify/${encodeURIComponent(txRef)}`,
    {
      headers: {
        Authorization: `Bearer ${config.secretKey}`,
      },
    }
  );

  return response.data;
}

function normalizeSignatureValue(signature) {
  if (!signature) return null;
  return String(signature)
    .replace(/^sha256=/i, "")
    .replace(/^v0=/i, "")
    .trim();
}

function getWebhookSignatureHeader(req) {
  return (
    req.headers["x-chapa-signature"] ||
    req.headers["x-chapa-hash"] ||
    req.headers["verif-hash"] ||
    req.headers["x-webhook-signature"] ||
    null
  );
}

function verifyWebhookSignature(req) {
  const config = getConfig();
  const providedSignature = normalizeSignatureValue(getWebhookSignatureHeader(req));
  if (!providedSignature) {
    return true;
  }

  if (!req.rawBody) {
    return false;
  }

  const expectedHex = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(req.rawBody)
    .digest("hex");
  const expectedBase64 = crypto
    .createHmac("sha256", config.webhookSecret)
    .update(req.rawBody)
    .digest("base64");

  const providedBuffer = Buffer.from(providedSignature);
  const hexBuffer = Buffer.from(expectedHex);
  const base64Buffer = Buffer.from(expectedBase64);

  if (providedBuffer.length === hexBuffer.length) {
    return crypto.timingSafeEqual(providedBuffer, hexBuffer);
  }

  if (providedBuffer.length === base64Buffer.length) {
    return crypto.timingSafeEqual(providedBuffer, base64Buffer);
  }

  return providedSignature === expectedHex || providedSignature === expectedBase64;
}

function buildChapaPayload({
  amount,
  currency,
  txRef,
  email,
  firstName,
  lastName,
  phoneNumber,
  title,
  description,
  callbackUrl,
  returnUrl,
  metadata,
}) {
  const config = getConfig();
  return {
    amount: String(amount),
    currency: currency || "ETB",
    email,
    first_name: firstName || "Customer",
    last_name: lastName || "User",
    phone_number: phoneNumber || undefined,
    tx_ref: String(txRef || generateTxRef("payment")).slice(0, 50),
    callback_url: callbackUrl || config.callbackUrl || undefined,
    return_url: returnUrl || config.returnUrl || undefined,
    customization: {
      title: String(title || "StartupConnect").slice(0, 16),
      description: description || "Payment checkout",
    },
    meta: metadata || {},
  };
}

module.exports = {
  generateTxRef,
  initializePayment,
  verifyPayment,
  verifyWebhookSignature,
  buildChapaPayload,
};
