/**
 * FIFO lot management for the Milhas module.
 * Server-only — imports Drizzle and schema directly.
 */
import "server-only";

import { and, asc, eq, gt } from "drizzle-orm";
import { sql } from "drizzle-orm";
import type { PgDatabase } from "drizzle-orm/node-postgres";
import type * as schema from "@/db/schema";
import { milhasLotAllocations, milhasLots } from "@/db/schema";

// Works for both the top-level db and a db.transaction(tx) context.
type DbOrTx = PgDatabase<typeof schema>;

// ─── Lot creation ─────────────────────────────────────────────────────────────

/**
 * Creates a FIFO lot when an EARN or ADJUST transaction is recorded.
 * Must be called within the same DB transaction as the transaction insert.
 */
export async function createLotForTransaction(
	db: DbOrTx,
	params: {
		userId: string;
		accountId: string;
		transactionId: string;
		amount: number;
		occurredAt: Date;
		expiresAt: Date | null;
		costBrl: string | null;
	},
): Promise<void> {
	await db.insert(milhasLots).values({
		userId: params.userId,
		accountId: params.accountId,
		transactionId: params.transactionId,
		originalAmount: params.amount,
		remainingAmount: params.amount,
		occurredAt: params.occurredAt,
		expiresAt: params.expiresAt,
		costBrl: params.costBrl,
	});
}

// ─── Lot consumption ──────────────────────────────────────────────────────────

/**
 * Consumes miles FIFO for a debit transaction (REDEEM, TRANSFER, EXPIRE).
 *
 * Strategy: oldest lot first (occurredAt ASC, then createdAt ASC for ties).
 *
 * Best-effort: if tracked lots cover less than the full amount (e.g. because
 * older transactions pre-date FIFO tracking), allocates what is available and
 * leaves the remainder untracked. This ensures backward compatibility with
 * transactions created before this feature was enabled.
 */
export async function consumeLotsForTransaction(
	db: DbOrTx,
	params: {
		userId: string;
		accountId: string;
		transactionId: string;
		amount: number;
	},
): Promise<void> {
	const lots = await db
		.select()
		.from(milhasLots)
		.where(
			and(
				eq(milhasLots.accountId, params.accountId),
				eq(milhasLots.userId, params.userId),
				gt(milhasLots.remainingAmount, 0),
			),
		)
		.orderBy(asc(milhasLots.occurredAt), asc(milhasLots.createdAt));

	let remaining = params.amount;

	for (const lot of lots) {
		if (remaining <= 0) break;

		const consume = Math.min(lot.remainingAmount, remaining);

		await db.insert(milhasLotAllocations).values({
			userId: params.userId,
			lotId: lot.id,
			transactionId: params.transactionId,
			consumedAmount: consume,
		});

		await db
			.update(milhasLots)
			.set({
				remainingAmount: sql`${milhasLots.remainingAmount} - ${consume}`,
			})
			.where(eq(milhasLots.id, lot.id));

		remaining -= consume;
	}
	// If remaining > 0 here, the debit covers pre-FIFO miles — allowed silently.
}

// ─── Lot release ──────────────────────────────────────────────────────────────

/**
 * Reverses all lot allocations for a deleted debit transaction.
 * Restores remainingAmount in each affected lot, then removes the allocation
 * records. Must be called BEFORE deleting the transaction row.
 */
export async function releaseLotAllocations(
	db: DbOrTx,
	params: { userId: string; transactionId: string },
): Promise<void> {
	const allocations = await db
		.select()
		.from(milhasLotAllocations)
		.where(
			and(
				eq(milhasLotAllocations.transactionId, params.transactionId),
				eq(milhasLotAllocations.userId, params.userId),
			),
		);

	for (const alloc of allocations) {
		await db
			.update(milhasLots)
			.set({
				remainingAmount: sql`${milhasLots.remainingAmount} + ${alloc.consumedAmount}`,
			})
			.where(eq(milhasLots.id, alloc.lotId));
	}

	await db
		.delete(milhasLotAllocations)
		.where(
			and(
				eq(milhasLotAllocations.transactionId, params.transactionId),
				eq(milhasLotAllocations.userId, params.userId),
			),
		);
}

// ─── Lot deletion safety check ────────────────────────────────────────────────

/**
 * Returns whether the lot for an EARN/ADJUST transaction can be safely deleted.
 * A lot is safe to delete only when none of its miles have been allocated yet.
 */
export async function lotDeletionCheck(
	db: DbOrTx,
	params: { userId: string; transactionId: string },
): Promise<{ canDelete: boolean; consumedAmount: number }> {
	const lot = await db.query.milhasLots.findFirst({
		where: and(
			eq(milhasLots.transactionId, params.transactionId),
			eq(milhasLots.userId, params.userId),
		),
	});

	if (!lot) return { canDelete: true, consumedAmount: 0 };

	const consumedAmount = lot.originalAmount - lot.remainingAmount;
	return { canDelete: consumedAmount === 0, consumedAmount };
}
