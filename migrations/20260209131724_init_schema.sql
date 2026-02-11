-- migrate:up

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

-- =========================
-- ENUMS
-- =========================

CREATE TYPE membership_role AS ENUM ('admin', 'member');



-- =========================
-- USERS
-- =========================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email CITEXT NOT NULL,
  password_hash TEXT NOT NULL,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP NULL
);

-- Partial Unique (Soft Delete)
CREATE UNIQUE INDEX idx_users_email_active
  ON users(email)
  WHERE deleted_at IS NULL;

-- Performance for query for active User
CREATE INDEX idx_users_active
  ON users(id)
  WHERE deleted_at IS NULL;



-- =========================
-- ORGANIZATIONS
-- =========================

CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  updated_at TIMESTAMP NOT NULL DEFAULT now(),
  deleted_at TIMESTAMP NULL
);

-- Partial Unique für slug
CREATE UNIQUE INDEX idx_org_slug_active
  ON organizations(slug)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_org_active
  ON organizations(id)
  WHERE deleted_at IS NULL;



-- =========================
-- MEMBERSHIPS
-- =========================

CREATE TABLE memberships (
  organization_id UUID NOT NULL,
  user_id UUID NOT NULL,
  role membership_role NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  removed_at TIMESTAMP NULL,

  PRIMARY KEY (organization_id, user_id),

  CONSTRAINT fk_membership_org
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,

  CONSTRAINT fk_membership_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

--Indexing for Fast queries (user + org)
CREATE INDEX idx_memberships_user_org_active
  ON memberships(user_id, organization_id)
  WHERE removed_at IS NULL;

-- For org member listing
CREATE INDEX idx_memberships_org_active
  ON memberships(organization_id)
  WHERE removed_at IS NULL;

-- =========================
-- REFRESH SESSIONS
-- =========================

CREATE TABLE refresh_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,


  created_at TIMESTAMP NOT NULL DEFAULT now(),
  revoked_at TIMESTAMP NULL,

  -- optional metadata (Security & Support)
  user_agent TEXT NULL,
  ip INET NULL
);

-- fast query for session with active user
CREATE INDEX idx_refresh_sessions_user_active
  ON refresh_sessions(user_id)
  WHERE revoked_at IS NULL;



-- =========================
-- REFRESH TOKENS
-- =========================

CREATE TABLE refresh_tokens (
  -- jti aus JWT als stable identifier
  jti UUID PRIMARY KEY,

  session_id UUID NOT NULL
    REFERENCES refresh_sessions(id)
    ON DELETE CASCADE,

  -- nur Hash speichern (z.B. sha256 oder argon2id hash)
  token_hash TEXT NOT NULL,

  issued_at TIMESTAMP NOT NULL DEFAULT now(),
  expires_at TIMESTAMP NOT NULL,

  revoked_at TIMESTAMP NULL,

  -- Rotation Chain: welcher Token kam danach
  replaced_by UUID NULL
    REFERENCES refresh_tokens(jti)
);

-- Lookup: Refresh request -> jti finden, nur aktive Tokens
CREATE INDEX idx_refresh_tokens_session_active
  ON refresh_tokens(session_id)
  WHERE revoked_at IS NULL;

-- Optional: zusätzlich für Cleanup-Jobs
CREATE INDEX idx_refresh_tokens_expires_at
  ON refresh_tokens(expires_at);

-- Optional: wenn du oft "token by session + expires" prüfst
CREATE INDEX idx_refresh_tokens_session_expires
  ON refresh_tokens(session_id, expires_at);




-- =========================
-- UPDATED_AT TRIGGER
-- =========================

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orgs_updated_at
BEFORE UPDATE ON organizations
FOR EACH ROW
EXECUTE FUNCTION set_updated_at();



-- =========================
-- migrate:down
-- =========================

DROP TRIGGER IF EXISTS trg_orgs_updated_at ON organizations;
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;

DROP FUNCTION IF EXISTS set_updated_at;

DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS refresh_sessions;
DROP TABLE IF EXISTS memberships;
DROP TABLE IF EXISTS organizations;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS membership_role;
