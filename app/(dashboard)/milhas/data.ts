import { and, desc, eq, gt, gte, inArray, isNotNull, sql } from "drizzle-orm";
import {
	milhasAccounts,
	milhasPrograms,
	milhasTransactions,
	type MilhasTransaction,
} from "@/db/schema";
import { db } from "@/lib/db";
import { CREDIT_TYPES } from "@/lib/milhas/constants";
import type {
	MilhasAccountData,
	MilhasCostBasis,
	MilhasExpirationSummary,
	MilhasProgramData,
	MilhasRedemptionMetric,
	MilhasTransactionData,
	MilhasTransactionFilter,
	MilhasTransactionType,
} from "@/lib/milhas/types";

// Re-export types so existing page imports keep working
export type {
	MilhasAccountData,
	MilhasCostBasis,
	MilhasExpirationSummary,
	MilhasProgramData,
	MilhasRedemptionMetric,
	MilhasTransactionData,
	MilhasTransactionFilter,
	MilhasTransactionType,
};

// ─── Fetch functions ──────────────────────────────────────────────────────────

export async function fetchMilhasProgramsForUser(
	userId: string,
): Promise<MilhasProgramData[]> {
	const rows = await db.query.milhasPrograms.findMany({
		columns: { id: true, name: true, referenceValuePer1000Brl: true },
		where: eq(milhasPrograms.userId, userId),
		orderBy: [milhasPrograms.name],
	});
	return rows;
}

export async function fetchMilhasAccountsWithBalance(
	userId: string,
): Promise<MilhasAccountData[]> {
	const rows = await db
		.select({
			id: milhasAccounts.id,
			name: milhasAccounts.name,
			programId: milhasAccounts.programId,
			programName: milhasPrograms.name,
			referenceValuePer1000Brl: milhasPrograms.referenceValuePer1000Brl,
			balance: sql<number>`
				COALESCE(
					SUM(
						CASE
							WHEN ${milhasTransactions.type} IN ('EARN', 'ADJUST') THEN ${milhasTransactions.amount}
							ELSE -${milhasTransactions.amount}
						END
					),
					0
				)
			`.mapWith(Number),
		})
		.from(milhasAccounts)
		.innerJoin(
			milhasPrograms,
			eq(milhasAccounts.programId, milhasPrograms.id),
		)
		.leftJoin(
			milhasTransactions,
			eq(milhasTransactions.accountId, milhasAccounts.id),
		)
		.where(eq(milhasAccounts.userId, userId))
		.groupBy(
			milhasAccounts.id,
			milhasAccounts.name,
			milhasAccounts.programId,
			milhasPrograms.name,
			milhasPrograms.referenceValuePer1000Brl,
		)
		.orderBy(milhasPrograms.name, milhasAccounts.name);

	return rows;
}

export async function fetchMilhasAccountById(
	userId: string,
	accountId: string,
): Promise<MilhasAccountData | null> {
	const rows = await db
		.select({
			id: milhasAccounts.id,
			name: milhasAccounts.name,
			programId: milhasAccounts.programId,
			programName: milhasPrograms.name,
			referenceValuePer1000Brl: milhasPrograms.referenceValuePer1000Brl,
			balance: sql<number>`
				COALESCE(
					SUM(
						CASE
							WHEN ${milhasTransactions.type} IN ('EARN', 'ADJUST') THEN ${milhasTransactions.amount}
							ELSE -${milhasTransactions.amount}
						END
					),
					0
				)
			`.mapWith(Number),
		})
		.from(milhasAccounts)
		.innerJoin(
			milhasPrograms,
			eq(milhasAccounts.programId, milhasPrograms.id),
		)
		.leftJoin(
			milhasTransactions,
			eq(milhasTransactions.accountId, milhasAccounts.id),
		)
		.where(
			and(
				eq(milhasAccounts.id, accountId),
				eq(milhasAccounts.userId, userId),
			),
		)
		.groupBy(
			milhasAccounts.id,
			milhasAccounts.name,
			milhasAccounts.programId,
			milhasPrograms.name,
			milhasPrograms.referenceValuePer1000Brl,
		)
		.limit(1);

	return rows[0] ?? null;
}

export async function fetchMilhasTransactions(
	userId: string,
	accountId: string,
	filter: MilhasTransactionFilter = "30",
): Promise<MilhasTransactionData[]> {
	const cutoff =
		filter === "all"
			? null
			: new Date(Date.now() - Number(filter) * 24 * 60 * 60 * 1000);

	const rows = await db.query.milhasTransactions.findMany({
		where: and(
			eq(milhasTransactions.accountId, accountId),
			eq(milhasTransactions.userId, userId),
			cutoff !== null
				? gte(milhasTransactions.occurredAt, cutoff)
				: undefined,
		),
		orderBy: [desc(milhasTransactions.occurredAt)],
	});

	return (rows as MilhasTransaction[]).map((row): MilhasTransactionData => ({
		id: row.id,
		type: row.type as MilhasTransactionType,
		amount: row.amount,
		occurredAt: row.occurredAt,
		expiresAt: row.expiresAt,
		description: row.description,
		costBrl: row.costBrl,
		cashEquivalentBrl: row.cashEquivalentBrl,
		createdAt: row.createdAt,
	}));
}

// Keep CREDIT_TYPES exported for any legacy usage (prefer lib/milhas/constants)
export { CREDIT_TYPES };

// ─── Metric queries ───────────────────────────────────────────────────────────

/**
 * Computes cost basis for a single account.
 * Only considers credit transactions (EARN / positive ADJUST) that have a
 * non-null costBrl, so free miles (card accrual, bonuses) are excluded.
 */
export async function fetchAccountCostBasis(
	userId: string,
	accountId: string,
): Promise<MilhasCostBasis> {
	const [row] = await db
		.select({
			totalCostBrl: sql<number>`
				COALESCE(SUM(${milhasTransactions.costBrl}::numeric), 0)
			`.mapWith(Number),
			totalCreditedMiles: sql<number>`
				COALESCE(SUM(${milhasTransactions.amount}), 0)
			`.mapWith(Number),
		})
		.from(milhasTransactions)
		.where(
			and(
				eq(milhasTransactions.accountId, accountId),
				eq(milhasTransactions.userId, userId),
				inArray(milhasTransactions.type, ["EARN", "ADJUST"]),
				gt(milhasTransactions.amount, 0),
				isNotNull(milhasTransactions.costBrl),
			),
		);

	const totalCostBrl = row?.totalCostBrl ?? 0;
	const totalCreditedMiles = row?.totalCreditedMiles ?? 0;
	const avgCostPer1000 =
		totalCreditedMiles > 0
			? (totalCostBrl / totalCreditedMiles) * 1000
			: null;

	return { totalCostBrl, totalCreditedMiles, avgCostPer1000 };
}

/**
 * Returns the total miles expiring within the next 90 days for one account.
 * MVP approach: sums credit transactions with a future expiresAt in the window.
 */
export async function fetchAccountExpiration90(
	userId: string,
	accountId: string,
): Promise<number> {
	const [row] = await db
		.select({
			expiring: sql<number>`
				COALESCE(SUM(${milhasTransactions.amount}), 0)
			`.mapWith(Number),
		})
		.from(milhasTransactions)
		.where(
			and(
				eq(milhasTransactions.accountId, accountId),
				eq(milhasTransactions.userId, userId),
				inArray(milhasTransactions.type, ["EARN", "ADJUST"]),
				gt(milhasTransactions.amount, 0),
				isNotNull(milhasTransactions.expiresAt),
				sql`${milhasTransactions.expiresAt} > CURRENT_DATE`,
				sql`${milhasTransactions.expiresAt} <= CURRENT_DATE + INTERVAL '90 days'`,
			),
		);

	return row?.expiring ?? 0;
}

/**
 * Computes expiration summary across all accounts for the given user.
 * Returns totals for 30/60/90-day windows plus a per-account breakdown
 * (sorted by soonest expiry) for accounts with miles expiring within 90 days.
 */
export async function fetchExpirationSummary(
	userId: string,
): Promise<MilhasExpirationSummary> {
	// Shared base conditions (only future expirations within 90 days)
	const baseWhere = () =>
		and(
			eq(milhasTransactions.userId, userId),
			inArray(milhasTransactions.type, ["EARN", "ADJUST"]),
			gt(milhasTransactions.amount, 0),
			isNotNull(milhasTransactions.expiresAt),
			sql`${milhasTransactions.expiresAt} > CURRENT_DATE`,
			sql`${milhasTransactions.expiresAt} <= CURRENT_DATE + INTERVAL '90 days'`,
		);

	// ── Global totals for 30 / 60 / 90 days ──────────────────────────────────
	const [totalsRow] = await db
		.select({
			expiring30: sql<number>`
				COALESCE(SUM(
					CASE
						WHEN ${milhasTransactions.expiresAt} <= CURRENT_DATE + INTERVAL '30 days'
						THEN ${milhasTransactions.amount}
						ELSE 0
					END
				), 0)
			`.mapWith(Number),
			expiring60: sql<number>`
				COALESCE(SUM(
					CASE
						WHEN ${milhasTransactions.expiresAt} <= CURRENT_DATE + INTERVAL '60 days'
						THEN ${milhasTransactions.amount}
						ELSE 0
					END
				), 0)
			`.mapWith(Number),
			expiring90: sql<number>`
				COALESCE(SUM(${milhasTransactions.amount}), 0)
			`.mapWith(Number),
		})
		.from(milhasTransactions)
		.where(baseWhere());

	// ── Per-account breakdown ─────────────────────────────────────────────────
	const byAccountRows = await db
		.select({
			accountId: milhasTransactions.accountId,
			accountName: milhasAccounts.name,
			programName: milhasPrograms.name,
			expiring90: sql<number>`
				COALESCE(SUM(${milhasTransactions.amount}), 0)
			`.mapWith(Number),
			// MIN returns a raw string for date columns inside aggregates
			nextExpiresAt: sql<string | null>`
				MIN(${milhasTransactions.expiresAt})
			`,
		})
		.from(milhasTransactions)
		.innerJoin(
			milhasAccounts,
			eq(milhasTransactions.accountId, milhasAccounts.id),
		)
		.innerJoin(
			milhasPrograms,
			eq(milhasAccounts.programId, milhasPrograms.id),
		)
		.where(baseWhere())
		.groupBy(
			milhasTransactions.accountId,
			milhasAccounts.name,
			milhasPrograms.name,
		)
		.orderBy(sql`MIN(${milhasTransactions.expiresAt})`);

	return {
		totals: {
			expiring30: totalsRow?.expiring30 ?? 0,
			expiring60: totalsRow?.expiring60 ?? 0,
			expiring90: totalsRow?.expiring90 ?? 0,
		},
		byAccount: (
			byAccountRows as {
				accountId: string;
				accountName: string;
				programName: string;
				expiring90: number;
				nextExpiresAt: string | null;
			}[]
		).map((row) => ({
			accountId: row.accountId,
			accountName: row.accountName,
			programName: row.programName,
			expiring90: row.expiring90,
			nextExpiresAt: row.nextExpiresAt,
		})),
	};
}

/**
 * Returns the last 10 REDEEM transactions for an account that have a
 * cashEquivalentBrl value, annotated with value-per-1 000 and ROI vs cost basis.
 */
export async function fetchRedemptionMetrics(
	userId: string,
	accountId: string,
): Promise<MilhasRedemptionMetric[]> {
	// Need cost basis for ROI calculation
	const costBasis = await fetchAccountCostBasis(userId, accountId);

	const rows = await db
		.select({
			id: milhasTransactions.id,
			occurredAt: milhasTransactions.occurredAt,
			amount: milhasTransactions.amount,
			cashEquivalentBrl: sql<number>`
				${milhasTransactions.cashEquivalentBrl}::numeric
			`.mapWith(Number),
			description: milhasTransactions.description,
		})
		.from(milhasTransactions)
		.where(
			and(
				eq(milhasTransactions.accountId, accountId),
				eq(milhasTransactions.userId, userId),
				eq(milhasTransactions.type, "REDEEM"),
				isNotNull(milhasTransactions.cashEquivalentBrl),
			),
		)
		.orderBy(desc(milhasTransactions.occurredAt))
		.limit(10);

	return (
		rows as {
			id: string;
			occurredAt: Date;
			amount: number;
			cashEquivalentBrl: number;
			description: string | null;
		}[]
	).map((row) => {
		const valuePer1000 =
			row.amount > 0 ? (row.cashEquivalentBrl / row.amount) * 1000 : 0;

		const roiPercent =
			costBasis.avgCostPer1000 !== null && costBasis.avgCostPer1000 > 0
				? ((valuePer1000 / costBasis.avgCostPer1000) - 1) * 100
				: null;

		return {
			id: row.id,
			occurredAt: row.occurredAt,
			amount: row.amount,
			cashEquivalentBrl: row.cashEquivalentBrl,
			valuePer1000,
			roiPercent,
			description: row.description,
		};
	});
}
