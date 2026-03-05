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
	/** Market reference value per 1 000 miles in BRL, or null if not configured. */
	referenceValuePer1000Brl: string | null;
};

export type MilhasAccountData = {
	id: string;
	name: string;
	programId: string;
	programName: string;
	balance: number;
	/** Inherited from the program; null if not configured. */
	referenceValuePer1000Brl: string | null;
};

export type MilhasTransactionData = {
	id: string;
	type: MilhasTransactionType;
	amount: number;
	occurredAt: Date;
	expiresAt: Date | null;
	description: string | null;
	/**
	 * BRL paid to acquire these miles (credit transactions only).
	 * Stored as numeric string from DB; null means free miles.
	 */
	costBrl: string | null;
	/**
	 * Cash-equivalent value of a redemption in BRL (REDEEM only).
	 * Used to compute redemption value-per-1 000 and ROI.
	 */
	cashEquivalentBrl: string | null;
	createdAt: Date;
};
