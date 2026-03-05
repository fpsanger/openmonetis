import { and, desc, eq, gte, sql } from "drizzle-orm";
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
	MilhasProgramData,
	MilhasTransactionData,
	MilhasTransactionFilter,
	MilhasTransactionType,
} from "@/lib/milhas/types";

// Re-export types so existing page imports keep working
export type {
	MilhasAccountData,
	MilhasProgramData,
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
