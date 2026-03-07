import { MilhasPage } from "@/components/milhas/milhas-page";
import { getUserId } from "@/lib/auth/server";
import { fetchMilhasDashboardData } from "./data";

export default async function Page() {
	const userId = await getUserId();
	const { summary, accounts, redemptions, expirationSummary } =
		await fetchMilhasDashboardData(userId);
	return (
		<main className="flex flex-col items-start gap-6">
			<MilhasPage
				summary={summary}
				accounts={accounts}
				redemptions={redemptions}
				expirationSummary={expirationSummary}
			/>
		</main>
	);
}
