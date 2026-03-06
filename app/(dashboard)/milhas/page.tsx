import { MilhasPage } from "@/components/milhas/milhas-page";
import { getUserId } from "@/lib/auth/server";
import { fetchExpirationSummary, fetchMilhasAccountsWithBalance } from "./data";

export default async function Page() {
	const userId = await getUserId();
	const [accounts, expirationSummary] = await Promise.all([
		fetchMilhasAccountsWithBalance(userId),
		fetchExpirationSummary(userId),
	]);
	return (
		<main className="flex flex-col items-start gap-6">
			<MilhasPage accounts={accounts} expirationSummary={expirationSummary} />
		</main>
	);
}
