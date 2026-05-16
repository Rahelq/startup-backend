const crypto = require("crypto");

function generateTxRef(prefix = "tx") {
  const safePrefix = String(prefix || "tx")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 10);
  const stamp = Date.now().toString(36);
  const rand = crypto.randomBytes(4).toString("hex");
  const txRef = `${safePrefix || "tx"}_${stamp}_${rand}`;
  return txRef.slice(0, 50);
}

function generateInvoiceNumber() {
  const now = new Date();
  const y = now.getUTCFullYear();
  const m = String(now.getUTCMonth() + 1).padStart(2, "0");
  const d = String(now.getUTCDate()).padStart(2, "0");
  const short = crypto.randomUUID().split("-")[0].toUpperCase();
  return `INV-${y}${m}${d}-${short}`;
}

module.exports = {
  generateTxRef,
  generateInvoiceNumber,
};
