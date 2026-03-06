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

// ─── Metric shapes (computed server-side, passed as props) ────────────────────

/** Cost basis metrics for a single account. */
export type MilhasCostBasis = {
	/** Total BRL spent across all paid credit transactions. */
	totalCostBrl: number;
	/** Total miles acquired with a non-null cost (paid miles only). */
	totalCreditedMiles: number;
	/**
	 * Average cost per 1 000 miles in BRL.
	 * Null when there are no paid miles (all miles were free).
	 */
	avgCostPer1000: number | null;
};

/** Expiring-miles totals for three look-ahead windows. */
export type MilhasExpirationWindow = {
	expiring30: number;
	expiring60: number;
	expiring90: number;
};

/**
 * Per-account expiration entry for the /milhas list.
 * nextExpiresAt is an ISO date string (YYYY-MM-DD) returned by the MIN() aggregate.
 */
export type MilhasExpirationAccountEntry = {
	accountId: string;
	accountName: string;
	programName: string;
	expiring90: number;
	nextExpiresAt: string | null;
};

/** Combined expiration summary for the /milhas main page. */
export type MilhasExpirationSummary = {
	totals: MilhasExpirationWindow;
	/** Accounts with miles expiring within 90 days, sorted by soonest expiry. */
	byAccount: MilhasExpirationAccountEntry[];
};

/** Metrics for a single REDEEM transaction with a cash-equivalent value. */
export type MilhasRedemptionMetric = {
	id: string;
	occurredAt: Date;
	/** Miles redeemed. */
	amount: number;
	/** Cash equivalent value in BRL. */
	cashEquivalentBrl: number;
	/** (cashEquivalentBrl / amount) × 1 000 */
	valuePer1000: number;
	/**
	 * ((valuePer1000 / avgCostPer1000) − 1) × 100.
	 * Null when there is no cost basis for comparison.
	 */
	roiPercent: number | null;
	description: string | null;
};
