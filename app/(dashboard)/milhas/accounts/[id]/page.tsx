import { notFound } from "next/navigation";
import { MilhasAccountDetail } from "@/components/milhas/milhas-account-detail";
import { getUserId } from "@/lib/auth/server";
import {
	fetchAccountCostBasis,
	fetchAccountExpiration90,
	fetchMilhasAccountById,
	fetchMilhasAccountsWithBalance,
	fetchMilhasTransactions,
	fetchRedemptionMetrics,
} from "../../data";
import type {
	MilhasExpiresFilter,
	MilhasTransactionFilters,
	MilhasTransactionSortDir,
	MilhasTransactionSortField,
} from "@/lib/milhas/types";

const VALID_DATE_RANGES = ["30", "90", "all"] as const;
const VALID_TYPES = ["EARN", "REDEEM", "TRANSFER", "EXPIRE", "ADJUST"] as const;
const VALID_EXPIRES = ["30", "60", "90", "expired"] as const;
const VALID_SORTS = [
	"occurredAt",
	"amount",
	"expiresAt",
	"costBrl",
	"cashEquivalentBrl",
] as const;

interface PageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function Page({ params, searchParams }: PageProps) {
	const { id } = await params;
	const sp = await searchParams;

	const get = (key: string) =>
		typeof sp[key] === "string" ? (sp[key] as string) : undefined;

	const dateRange = VALID_DATE_RANGES.includes(
		get("filter") as (typeof VALID_DATE_RANGES)[number],
	)
		? (get("filter") as (typeof VALID_DATE_RANGES)[number])
		: "30";

	const type = VALID_TYPES.includes(
		get("type") as (typeof VALID_TYPES)[number],
	)
		? (get("type") as (typeof VALID_TYPES)[number])
		: undefined;

	const expiresWindow = VALID_EXPIRES.includes(
		get("expires") as MilhasExpiresFilter,
	)
		? (get("expires") as MilhasExpiresFilter)
		: undefined;

	const sort = VALID_SORTS.includes(
		get("sort") as MilhasTransactionSortField,
	)
		? (get("sort") as MilhasTransactionSortField)
		: undefined;

	const sortDir =
		get("sortDir") === "asc" || get("sortDir") === "desc"
			? (get("sortDir") as MilhasTransactionSortDir)
			: undefined;

	const filters: MilhasTransactionFilters = {
		dateRange,
		type,
		expiresWindow,
		hasCostBrl: get("hasCost") === "1",
		hasCashEquivalentBrl: get("hasCashEq") === "1",
		q: get("q") ?? undefined,
		sort,
		sortDir,
	};

	const userId = await getUserId();
	const [account, allAccounts, transactions, costBasis, expiring90, redemptionMetrics] =
		await Promise.all([
			fetchMilhasAccountById(userId, id),
			fetchMilhasAccountsWithBalance(userId),
			fetchMilhasTransactions(userId, id, filters),
			fetchAccountCostBasis(userId, id),
			fetchAccountExpiration90(userId, id),
			fetchRedemptionMetrics(userId, id),
		]);

	if (!account) {
		notFound();
	}

	return (
		<main className="flex flex-col items-start gap-6">
			<MilhasAccountDetail
				account={account}
				allAccounts={allAccounts}
				transactions={transactions}
				costBasis={costBasis}
				expiring90={expiring90}
				redemptionMetrics={redemptionMetrics}
			/>
		</main>
	);
}
