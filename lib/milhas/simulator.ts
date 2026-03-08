/**
 * Redemption simulator for the Milhas module.
 * Server-only — reads lots and cost basis without writing to the DB.
 */
import "server-only";

import { and, asc, eq, gt, inArray, isNotNull, sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";
import { milhasLots, milhasTransactions } from "@/db/schema";
import type { MilhasRedemptionSimulation, SimulationLotConsumed } from "./types";

type DbOrTx = PgDatabase<typeof schema>;

/**
 * Simulates a REDEEM transaction without writing to the DB.
 *
 * Runs FIFO lot consumption (same order as consumeLotsForTransaction) to
 * estimate the actual cost basis that would be consumed, then derives ROI
 * and net extracted value from those numbers.
 */
export async function simulateRedemption(
	db: DbOrTx,
	params: {
		userId: string;
		accountId: string;
		milesAmount: number;
		cashEquivalentBrl: number;
	},
): Promise<MilhasRedemptionSimulation> {
	const { userId, accountId, milesAmount, cashEquivalentBrl } = params;

	// ── Cost basis (average acquisition cost) ────────────────────────────────
	const [costRow] = await db
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

	const avgCostPer1000 =
		costRow && costRow.totalCreditedMiles > 0
			? (costRow.totalCostBrl / costRow.totalCreditedMiles) * 1000
			: null;

	// ── FIFO lot simulation (read-only) ──────────────────────────────────────
	// Same ordering as consumeLotsForTransaction: oldest lot first.
	const lots = await db
		.select()
		.from(milhasLots)
		.where(
			and(
				eq(milhasLots.accountId, accountId),
				eq(milhasLots.userId, userId),
				gt(milhasLots.remainingAmount, 0),
			),
		)
		.orderBy(asc(milhasLots.occurredAt), asc(milhasLots.createdAt));

	const lotsConsumed: SimulationLotConsumed[] = [];
	let remaining = milesAmount;
	let fifoCostAccumulated = 0;
	let hasCostData = false;
	let expiringMilesConsumed = 0;
	let hasUrgentExpirationWarning = false;

	const now = Date.now();
	const MS_30D = 30 * 24 * 60 * 60 * 1000;
	const MS_90D = 90 * 24 * 60 * 60 * 1000;

	for (const lot of lots) {
		if (remaining <= 0) break;

		const consume = Math.min(lot.remainingAmount, remaining);

		// Proportional cost: fraction of the original lot being consumed.
		// lot.costBrl is the total cost for the original lot.
		const lotCost =
			lot.costBrl !== null
				? (consume / lot.originalAmount) * Number.parseFloat(lot.costBrl)
				: null;

		if (lotCost !== null) {
			fifoCostAccumulated += lotCost;
			hasCostData = true;
		}

		// Expiration impact
		if (lot.expiresAt) {
			const msToExpiry = new Date(lot.expiresAt).getTime() - now;
			if (msToExpiry > 0 && msToExpiry <= MS_90D) {
				expiringMilesConsumed += consume;
			}
			if (msToExpiry > 0 && msToExpiry <= MS_30D) {
				hasUrgentExpirationWarning = true;
			}
		}

		lotsConsumed.push({
			lotId: lot.id,
			occurredAt:
				lot.occurredAt instanceof Date
					? lot.occurredAt.toISOString().split("T")[0]
					: String(lot.occurredAt),
			expiresAt: lot.expiresAt
				? lot.expiresAt instanceof Date
					? lot.expiresAt.toISOString().split("T")[0]
					: String(lot.expiresAt)
				: null,
			consumedAmount: consume,
			costBrl: lotCost,
		});

		remaining -= consume;
	}

	// ── Derived metrics ───────────────────────────────────────────────────────
	const valuePer1000 =
		milesAmount > 0 ? (cashEquivalentBrl / milesAmount) * 1000 : 0;

	const roiPercent =
		avgCostPer1000 !== null && avgCostPer1000 > 0
			? ((valuePer1000 / avgCostPer1000) - 1) * 100
			: null;

	return {
		milesAmount,
		cashEquivalentBrl,
		valuePer1000,
		avgCostPer1000,
		roiPercent,
		fifoCostConsumed: hasCostData ? fifoCostAccumulated : null,
		netExtractedValue: hasCostData
			? cashEquivalentBrl - fifoCostAccumulated
			: null,
		lotsConsumed,
		expiringMilesConsumed,
		hasUrgentExpirationWarning,
	};
}
