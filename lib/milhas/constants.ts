/**
 * Shared Milhas constants — safe to import in both server and client components.
 * No Drizzle, no server-only dependencies.
 */

import type { MilhasTransactionType } from "./types";

// ─── Transaction type list ────────────────────────────────────────────────────

export const MILHAS_TRANSACTION_TYPES = [
	"EARN",
	"REDEEM",
	"TRANSFER",
	"EXPIRE",
	"ADJUST",
] as const;

// ─── Credit vs debit classification ──────────────────────────────────────────

/** Transaction types that increase the account balance. */
export const CREDIT_TYPES: ReadonlySet<MilhasTransactionType> = new Set([
	"EARN",
	"ADJUST",
]);

/** Transaction types that decrease the account balance. */
export const DEBIT_TYPES: ReadonlySet<MilhasTransactionType> = new Set([
	"REDEEM",
	"EXPIRE",
	"TRANSFER",
]);

// ─── Display labels ───────────────────────────────────────────────────────────

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

// ─── Badge variants ───────────────────────────────────────────────────────────

export type MilhasBadgeVariant =
	| "default"
	| "secondary"
	| "destructive"
	| "outline"
	| "success"
	| "info";

export const MILHAS_TYPE_BADGE_VARIANT: Record<
	MilhasTransactionType,
	MilhasBadgeVariant
> = {
	EARN: "success",
	ADJUST: "info",
	REDEEM: "destructive",
	EXPIRE: "destructive",
	TRANSFER: "secondary",
};

// ─── Filter options (for UI) ──────────────────────────────────────────────────

import type { MilhasTransactionFilter } from "./types";

export const MILHAS_FILTER_OPTIONS: {
	label: string;
	value: MilhasTransactionFilter;
}[] = [
	{ label: "30 dias", value: "30" },
	{ label: "90 dias", value: "90" },
	{ label: "Todas", value: "all" },
];
