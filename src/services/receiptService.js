const cloudinaryService = require("./cloudinaryService");

function buildMinimalPdf(receipt) {
  const safe = JSON.stringify(receipt, null, 2).replace(/[()]/g, "");
  const bodyText = `StartupConnect Receipt\\n${safe}`;
  const content = `%PDF-1.4\n1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj\n2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj\n3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>endobj\n4 0 obj<< /Length ${bodyText.length + 55} >>stream\nBT /F1 10 Tf 40 740 Td (${bodyText}) Tj ET\nendstream\nendobj\n5 0 obj<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>endobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000117 00000 n \n0000000247 00000 n \n0000000374 00000 n \ntrailer<< /Size 6 /Root 1 0 R >>\nstartxref\n445\n%%EOF`;
  return Buffer.from(content, "utf8");
}

async function generateReceiptDocument(receipt) {
  const data = {
    generated_at: new Date().toISOString(),
    ...receipt,
  };

  if (!cloudinaryService.isConfigured()) {
    return {
      url: null,
      metadata: data,
      provider: "inline",
    };
  }

  const pdfBuffer = buildMinimalPdf(data);
  const uploaded = await cloudinaryService.uploadBuffer(pdfBuffer, {
    mimetype: "application/pdf",
    kind: "document",
    folder: "startupconnect/receipts",
    resourceType: "raw",
  });

  return {
    url: uploaded.url,
    public_id: uploaded.public_id,
    metadata: data,
    provider: "cloudinary",
  };
}

module.exports = {
  generateReceiptDocument,
};
