-- Harden encrypt tokens at rest (Wave #17)
-- "User"."accessToken" now stores AES-256-GCM ciphertext written by
-- src/lib/token-crypto.ts, never plaintext. No column type change is
-- required (still TEXT); existing plaintext rows must be re-encrypted via a
-- one-off backfill before enforcing decrypt-on-read in production.

-- CreateTable
CREATE TABLE "TokenAuditLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "detail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TokenAuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TokenAuditLog_userId_idx" ON "TokenAuditLog"("userId");

-- CreateIndex
CREATE INDEX "TokenAuditLog_createdAt_idx" ON "TokenAuditLog"("createdAt");

-- AddForeignKey
ALTER TABLE "TokenAuditLog" ADD CONSTRAINT "TokenAuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Documentation only: mark the column as encrypted-at-rest.
COMMENT ON COLUMN "User"."accessToken" IS 'AES-256-GCM ciphertext (src/lib/token-crypto.ts). Never plaintext.';
