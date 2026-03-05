/**
 * Shared Milhas types — safe to import in both server and client components.
 * No Drizzle, no server-only dependencies.
 */

// ─── Transaction types ────────────────────────────────────────────────────────

export type MilhasTransactionType =
	| "EARN"
	| "REDEEM"
	| "TRANSFER"
	| "EXPIRE"
	| "ADJUST";

export type MilhasTransactionFilter = "30" | "90" | "all";

// ─── Data shapes (serialisable — safe to pass as Server Component props) ─────

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
