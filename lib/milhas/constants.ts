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
	"TRANSFER_OUT",
	"TRANSFER_IN",
	"EXPIRE",
	"ADJUST",
] as const;

/**
 * Types shown in the "create transaction" dialog selector.
 * TRANSFER_OUT and TRANSFER_IN are created automatically by transferMilhasAction
 * and should not appear as manual options.
 */
export const SELECTABLE_TRANSACTION_TYPES = [
	"EARN",
	"REDEEM",
	"TRANSFER",
	"EXPIRE",
	"ADJUST",
] as const satisfies readonly MilhasTransactionType[];

// ─── Credit vs debit classification ──────────────────────────────────────────

/** Transaction types that increase the account balance. */
export const CREDIT_TYPES: ReadonlySet<MilhasTransactionType> = new Set([
	"EARN",
	"ADJUST",
	"TRANSFER_IN",
]);

/** Transaction types that decrease the account balance. */
export const DEBIT_TYPES: ReadonlySet<MilhasTransactionType> = new Set([
	"REDEEM",
	"EXPIRE",
	"TRANSFER",
	"TRANSFER_OUT",
]);

// ─── Display labels ───────────────────────────────────────────────────────────

export const MILHAS_TRANSACTION_TYPE_LABEL: Record<
	MilhasTransactionType,
	string
> = {
	EARN: "Ganho",
	REDEEM: "Resgate",
	TRANSFER: "Transferência",
	TRANSFER_OUT: "Transferência (saída)",
	TRANSFER_IN: "Transferência (entrada)",
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
	TRANSFER_OUT: "secondary",
	TRANSFER_IN: "success",
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
