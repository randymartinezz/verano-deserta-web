-- ============================================================
-- VERANO DESERT — Ticket Fulfillment Schema
-- Run once in your Vercel Postgres database.
-- ============================================================

-- One row per fulfilled Stripe checkout session.
-- Serves as both the idempotency guard (UNIQUE on session_id)
-- and the email delivery tracker.
CREATE TABLE IF NOT EXISTS fulfilled_sessions (
  id                         BIGSERIAL    PRIMARY KEY,
  stripe_checkout_session_id TEXT         NOT NULL UNIQUE,
  fulfilled_at               TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  email_sent                 BOOLEAN      NOT NULL DEFAULT false,
  email_sent_at              TIMESTAMPTZ,
  email_last_error           TEXT
);

-- One row per issued ticket code.
-- quantity=3 on a single checkout → 3 rows, all sharing the same session_id.
CREATE TABLE IF NOT EXISTS tickets (
  id                         BIGSERIAL    PRIMARY KEY,
  ticket_code                TEXT         NOT NULL UNIQUE,
  event                      TEXT         NOT NULL DEFAULT 'halloween-2026',
  event_name                 TEXT         NOT NULL DEFAULT '¿QUIÉN MATÓ A LA NENA?',
  attendee_name              TEXT,
  email                      TEXT,
  ticket_type                TEXT         NOT NULL,
  stripe_checkout_session_id TEXT         NOT NULL,
  stripe_payment_intent_id   TEXT,
  amount_paid                INTEGER,        -- Stripe amount_total (cents)
  currency                   TEXT,
  purchase_quantity           INTEGER      NOT NULL DEFAULT 1,
  status                     TEXT         NOT NULL DEFAULT 'valid',
  used                       BOOLEAN      NOT NULL DEFAULT false,
  created_at                 TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  used_at                    TIMESTAMPTZ
);

-- Indexes for check-in lookups (code, name, email) and admin queries.
CREATE INDEX IF NOT EXISTS idx_tickets_code
  ON tickets (ticket_code);

CREATE INDEX IF NOT EXISTS idx_tickets_session
  ON tickets (stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_tickets_email
  ON tickets (email);

CREATE INDEX IF NOT EXISTS idx_tickets_attendee
  ON tickets (attendee_name);
