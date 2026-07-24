-- Track spendable XLM alongside raw balance (Wave #8)
-- Raw native XLM balance overstates what a contributor can actually spend:
-- Stellar accounts must keep a minimum reserve (base reserve * subentries/
-- sponsorships) plus any open sell-offer liabilities locked up. This column
-- stores the reserve-aware "spendable" amount computed in
-- src/lib/readiness.ts, used for readiness/reserve checks going forward.

-- AlterTable
ALTER TABLE "Registration" ADD COLUMN "spendableXlmBalance" TEXT NOT NULL DEFAULT '0';
