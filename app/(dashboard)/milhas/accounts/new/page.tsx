import { MilhasAccountNewForm } from "@/components/milhas/milhas-account-new-form";
import { getUserId } from "@/lib/auth/server";
import { fetchMilhasProgramsForUser } from "../../data";

export default async function Page() {
	const userId = await getUserId();
	const programs = await fetchMilhasProgramsForUser(userId);
	return (
		<main className="flex flex-col items-start gap-6">
			<MilhasAccountNewForm programs={programs} />
		</main>
	);
}
