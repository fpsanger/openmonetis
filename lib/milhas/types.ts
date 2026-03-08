/**
 * Shared Milhas types — safe to import in both server and client components.
 * No Drizzle, no server-only dependencies.
 */

// ─── Transaction types ────────────────────────────────────────────────────────

export type MilhasTransactionType =
	| "EARN"
	| "REDEEM"
	| "TRANSFER"
	| "TRANSFER_OUT"
	| "TRANSFER_IN"
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

// ─── Enhanced transaction filters (URL-param driven) ─────────────────────────

export type MilhasTransactionSortField =
	| "occurredAt"
	| "amount"
	| "expiresAt"
	| "costBrl"
	| "cashEquivalentBrl";

export type MilhasTransactionSortDir = "asc" | "desc";

export type MilhasExpiresFilter = "30" | "60" | "90" | "expired";

export type MilhasTransactionFilters = {
	/** Look-back window for occurredAt. Default "30". */
	dateRange?: MilhasTransactionFilter;
	type?: MilhasTransactionType;
	/** Filter by upcoming expiration window or expired. */
	expiresWindow?: MilhasExpiresFilter;
	hasCostBrl?: boolean;
	hasCashEquivalentBrl?: boolean;
	/** Case-insensitive substring match on description. */
	q?: string;
	sort?: MilhasTransactionSortField;
	sortDir?: MilhasTransactionSortDir;
};

// ─── Dashboard / portfolio shapes ─────────────────────────────────────────────

export type MilhasAccountWithMetrics = MilhasAccountData & {
	avgCostPer1000: number | null;
	estimatedValueBrl: number | null;
	expiring90: number;
};

export type MilhasDashboardSummary = {
	totalBalance: number;
	avgCostPer1000: number | null;
	/** Null when no accounts have a reference value configured. */
	estimatedValueBrl: number | null;
	expiring30: number;
	expiring60: number;
	expiring90: number;
	/** Average value extracted per 1,000 miles across all REDEEM transactions with cashEquivalentBrl. */
	avgRedemptionValuePer1000: number | null;
	/** Average ROI of REDEEM transactions vs global avg acquisition cost. */
	avgRoiPercent: number | null;
};

/** MilhasRedemptionMetric extended with account/program context. */
export type MilhasRedemptionMetricWithAccount = MilhasRedemptionMetric & {
	accountId: string;
	accountName: string;
	programName: string;
};

// ─── Redemption Simulator ─────────────────────────────────────────────────────

/** A single FIFO lot slice that would be consumed by the simulated redemption. */
export type SimulationLotConsumed = {
	lotId: string;
	/** ISO date string (YYYY-MM-DD). */
	occurredAt: string;
	/** ISO date string (YYYY-MM-DD) or null. */
	expiresAt: string | null;
	consumedAmount: number;
	/** Proportional BRL cost for this slice. Null if the lot has no cost (free miles). */
	costBrl: number | null;
};

export type MilhasRedemptionSimulation = {
	milesAmount: number;
	cashEquivalentBrl: number;
	/** (cashEquivalentBrl / milesAmount) × 1,000 */
	valuePer1000: number;
	/** Account average acquisition cost per 1,000 miles. Null if no paid credit transactions. */
	avgCostPer1000: number | null;
	/** ((valuePer1000 / avgCostPer1000) − 1) × 100. Null when avgCostPer1000 unavailable. */
	roiPercent: number | null;
	/** Total proportional FIFO cost basis consumed. Null if consumed lots have no cost data. */
	fifoCostConsumed: number | null;
	/** cashEquivalentBrl − fifoCostConsumed. Null when fifoCostConsumed is null. */
	netExtractedValue: number | null;
	/** FIFO lots that would be consumed, oldest first. */
	lotsConsumed: SimulationLotConsumed[];
	/** Miles consumed that are expiring within 90 days. */
	expiringMilesConsumed: number;
	/** True when at least some consumed miles expire within 30 days. */
	hasUrgentExpirationWarning: boolean;
};
