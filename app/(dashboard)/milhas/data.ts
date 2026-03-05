import { and, desc, eq, gte, sql } from "drizzle-orm";
import {
	milhasAccounts,
	milhasPrograms,
	milhasTransactions,
} from "@/db/schema";
import { db } from "@/lib/db";

// ─── Transaction types ───────────────────────────────────────────────────────

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
 * Types that increase balance; all others decrease.
 * Balance = SUM(amount) for credits − SUM(amount) for debits
 */
export const CREDIT_TYPES: ReadonlySet<MilhasTransactionType> = new Set([
	"EARN",
	"ADJUST",
]);

// ─── Data shapes ─────────────────────────────────────────────────────────────

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

// ─── Transaction filter ───────────────────────────────────────────────────────

export type MilhasTransactionFilter = "30" | "90" | "all";

// ─── Fetch functions ─────────────────────────────────────────────────────────

export async function fetchMilhasProgramsForUser(
	userId: string,
): Promise<MilhasProgramData[]> {
	const rows = await db.query.milhasPrograms.findMany({
		columns: { id: true, name: true },
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

	return rows.map((row) => ({
		id: row.id,
		type: row.type as MilhasTransactionType,
		amount: row.amount,
		occurredAt: row.occurredAt,
		expiresAt: row.expiresAt,
		description: row.description,
		createdAt: row.createdAt,
	}));
}
