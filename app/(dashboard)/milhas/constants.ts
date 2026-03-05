/**
 * constants.ts — pure JS/TS, zero DB imports.
 * Safe to import from BOTH server and client components.
 *
 * Rule: client components must import from THIS file only,
 * never from data.ts (which pulls in @/lib/db → pg → Node built-ins).
 */

// ─── Transaction types ────────────────────────────────────────────────────────

export const MILHAS_TRANSACTION_TYPES = [
	"EARN",
	"REDEEM",
	"TRANSFER",
	"EXPIRE",
	"ADJUST",
] as const;

export type MilhasTransactionType = (typeof MILHAS_TRANSACTION_TYPES)[number];

export const MILHAS_TRANSACTION_TYPE_LABEL: Record<
	MilhasTransactionType,
	string
> = {
	EARN: "Ganho",
	REDEEM: "Resgate",
	TRANSFER: "Transferência",
	EXPIRE: "Expiração",
	ADJUST: "Ajuste",
};

/**
 * Types that increase the account balance; all others decrease.
 * Balance = SUM(amount for credits) − SUM(amount for debits)
 */
export const CREDIT_TYPES: ReadonlySet<MilhasTransactionType> = new Set([
	"EARN",
	"ADJUST",
]);

// ─── Shared data-shape types ──────────────────────────────────────────────────
// Defined here so client components can import them without touching data.ts.

export type MilhasProgramData = {
	id: string;
	name: string;
};

export type MilhasAccountData = {
	id: string;
	name: string;
	programId: string;
	programName: string;
	balance: number;
};

export type MilhasTransactionData = {
	id: string;
	type: MilhasTransactionType;
	amount: number;
	occurredAt: Date;
	expiresAt: Date | null;
	description: string | null;
	createdAt: Date;
};

export type MilhasTransactionFilter = "30" | "90" | "all";
