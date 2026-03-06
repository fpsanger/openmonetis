import { notFound } from "next/navigation";
import { MilhasAccountDetail } from "@/components/milhas/milhas-account-detail";
import { getUserId } from "@/lib/auth/server";
import {
	fetchAccountCostBasis,
	fetchAccountExpiration90,
	fetchMilhasAccountById,
	fetchMilhasTransactions,
	fetchRedemptionMetrics,
} from "../../data";
import type { MilhasTransactionFilter } from "@/lib/milhas/types";

interface PageProps {
	params: Promise<{ id: string }>;
	searchParams: Promise<{ filter?: string }>;
}

export default async function Page({ params, searchParams }: PageProps) {
	const { id } = await params;
	const { filter: rawFilter } = await searchParams;

	const filter: MilhasTransactionFilter =
		rawFilter === "90" || rawFilter === "all" ? rawFilter : "30";

	const userId = await getUserId();
	const [account, transactions, costBasis, expiring90, redemptionMetrics] =
		await Promise.all([
			fetchMilhasAccountById(userId, id),
			fetchMilhasTransactions(userId, id, filter),
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
				transactions={transactions}
				filter={filter}
				costBasis={costBasis}
				expiring90={expiring90}
				redemptionMetrics={redemptionMetrics}
			/>
		</main>
	);
}
