const pool = require("../config/db");

async function migratePhase5Transactions() {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    await client.query(`
      ALTER TABLE payments
        ADD COLUMN IF NOT EXISTS payer_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS receiver_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS relationship_type VARCHAR(32),
        ADD COLUMN IF NOT EXISTS relationship_id INTEGER,
        ADD COLUMN IF NOT EXISTS session_id INTEGER,
        ADD COLUMN IF NOT EXISTS proposal_id INTEGER,
        ADD COLUMN IF NOT EXISTS investment_offer_id INTEGER,
        ADD COLUMN IF NOT EXISTS funding_request_id INTEGER,
        ADD COLUMN IF NOT EXISTS payment_type VARCHAR(40) DEFAULT 'consultation',
        ADD COLUMN IF NOT EXISTS platform_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS receiver_amount DECIMAL(14,2),
        ADD COLUMN IF NOT EXISTS transaction_reference VARCHAR(150),
        ADD COLUMN IF NOT EXISTS chapa_tx_ref VARCHAR(255),
        ADD COLUMN IF NOT EXISTS idempotency_key VARCHAR(150),
        ADD COLUMN IF NOT EXISTS description TEXT,
        ADD COLUMN IF NOT EXISTS receipt_url TEXT,
        ADD COLUMN IF NOT EXISTS invoice_number VARCHAR(60),
        ADD COLUMN IF NOT EXISTS metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        ADD COLUMN IF NOT EXISTS refunded_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
        ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
    `);

    await client.query(`
      UPDATE payments
      SET payer_id = from_user_id
      WHERE payer_id IS NULL AND from_user_id IS NOT NULL;
    `);

    await client.query(`
      UPDATE payments
      SET receiver_id = to_user_id
      WHERE receiver_id IS NULL AND to_user_id IS NOT NULL;
    `);

    await client.query(`
      UPDATE payments
      SET chapa_tx_ref = gateway_tx_ref
      WHERE chapa_tx_ref IS NULL AND gateway_tx_ref IS NOT NULL;
    `);

    await client.query(`
      UPDATE payments
      SET transaction_reference = COALESCE(transaction_reference, gateway_tx_ref)
      WHERE transaction_reference IS NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_transaction_reference
      ON payments (transaction_reference);
    `);

    await client.query(`
      UPDATE payments
      SET receiver_amount = COALESCE(receiver_amount, amount - platform_fee)
      WHERE receiver_amount IS NULL;
    `);

    await client.query(`
      ALTER TABLE payments
      DROP CONSTRAINT IF EXISTS payments_status_check;
    `);

    await client.query(`
      ALTER TABLE payments
      ADD CONSTRAINT payments_status_check
      CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'refunded', 'cancelled'));
    `);

    await client.query(`
      ALTER TABLE payments
      DROP CONSTRAINT IF EXISTS payments_payment_type_check;
    `);

    await client.query(`
      ALTER TABLE payments
      ADD CONSTRAINT payments_payment_type_check
      CHECK (payment_type IN (
        'mentorship_session',
        'mentorship_plan',
        'investment_funding',
        'milestone_release',
        'consultation',
        'subscription',
        'platform_fee'
      ));
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_chapa_tx_ref_unique
      ON payments (chapa_tx_ref)
      WHERE chapa_tx_ref IS NOT NULL;
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_payer_id_created_at
      ON payments (payer_id, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_receiver_id_created_at
      ON payments (receiver_id, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payments_relationship_lookup
      ON payments (relationship_type, relationship_id);
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_idempotency_key
      ON payments (idempotency_key)
      WHERE idempotency_key IS NOT NULL;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS financial_audit_logs (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER REFERENCES payments(payment_id) ON DELETE CASCADE,
        action VARCHAR(80) NOT NULL,
        performed_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        old_status VARCHAR(30),
        new_status VARCHAR(30),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_financial_audit_logs_payment
      ON financial_audit_logs (payment_id, created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_webhook_events (
        id SERIAL PRIMARY KEY,
        provider VARCHAR(40) NOT NULL,
        tx_ref VARCHAR(255),
        event_hash VARCHAR(255) NOT NULL,
        signature VARCHAR(255),
        payload JSONB NOT NULL,
        processed BOOLEAN NOT NULL DEFAULT FALSE,
        processed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_payment_webhook_events_hash_unique
      ON payment_webhook_events (event_hash);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payment_refunds (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER NOT NULL REFERENCES payments(payment_id) ON DELETE CASCADE,
        requested_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        approved_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
        reason TEXT,
        status VARCHAR(24) NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'approved', 'rejected', 'processed')),
        provider_reference VARCHAR(255),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment
      ON payment_refunds (payment_id, created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS invoices (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER UNIQUE REFERENCES payments(payment_id) ON DELETE CASCADE,
        invoice_number VARCHAR(60) NOT NULL UNIQUE,
        issued_to INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        issued_by INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
        amount DECIMAL(14,2) NOT NULL,
        platform_fee DECIMAL(14,2) NOT NULL DEFAULT 0,
        net_amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
        status VARCHAR(24) NOT NULL DEFAULT 'issued' CHECK (status IN ('issued', 'paid', 'refunded', 'cancelled')),
        document_url TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_invoices_issued_to_created
      ON invoices (issued_to, created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS investment_transactions (
        id SERIAL PRIMARY KEY,
        relationship_id INTEGER NOT NULL,
        investor_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        startup_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        offer_id INTEGER,
        funding_request_id INTEGER,
        payment_id INTEGER REFERENCES payments(payment_id) ON DELETE SET NULL,
        amount DECIMAL(14,2) NOT NULL CHECK (amount > 0),
        equity_percentage DECIMAL(6,3),
        transaction_stage VARCHAR(40) NOT NULL,
        milestone_reference VARCHAR(120),
        status VARCHAR(20) NOT NULL DEFAULT 'pledged' CHECK (status IN ('pledged', 'committed', 'released', 'completed', 'cancelled')),
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investment_transactions_relationship
      ON investment_transactions (relationship_id, created_at DESC);
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_investment_transactions_investor
      ON investment_transactions (investor_id, created_at DESC);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS platform_ledger_entries (
        id SERIAL PRIMARY KEY,
        payment_id INTEGER REFERENCES payments(payment_id) ON DELETE SET NULL,
        entry_type VARCHAR(40) NOT NULL CHECK (entry_type IN ('platform_fee', 'refund', 'payout', 'adjustment')),
        amount DECIMAL(14,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'ETB',
        notes TEXT,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_platform_ledger_entries_created
      ON platform_ledger_entries (created_at DESC);
    `);

    await client.query("COMMIT");
    console.log("migrate_phase5_transactions: complete ✅");
  } catch (error) {
    await client.query("ROLLBACK");
    console.error("migrate_phase5_transactions failed:", error.message);
    process.exitCode = 1;
  } finally {
    client.release();
    await pool.end();
  }
}

migratePhase5Transactions();
