"use client";

import {
	RiArrowLeftLine,
	RiDeleteBin5Line,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteMilhasTransactionAction } from "@/app/(dashboard)/milhas/actions";
import {
	MILHAS_TRANSACTION_TYPE_LABEL,
	type MilhasAccountData,
	type MilhasTransactionData,
	type MilhasTransactionFilter,
	type MilhasTransactionType,
} from "@/app/(dashboard)/milhas/data";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import { MilhasTransactionDialog } from "./milhas-transaction-dialog";

const CREDIT_TYPES = new Set(["EARN", "ADJUST"]);

const TYPE_BADGE_VARIANT: Record<
	string,
	"default" | "destructive" | "secondary" | "outline" | "success" | "info"
> = {
	EARN: "success",
	ADJUST: "info",
	REDEEM: "destructive",
	EXPIRE: "destructive",
	TRANSFER: "secondary",
};

const FILTER_OPTIONS: { label: string; value: MilhasTransactionFilter }[] = [
	{ label: "30 dias", value: "30" },
	{ label: "90 dias", value: "90" },
	{ label: "Todas", value: "all" },
];

interface MilhasAccountDetailProps {
	account: MilhasAccountData;
	transactions: MilhasTransactionData[];
	filter: MilhasTransactionFilter;
}

export function MilhasAccountDetail({
	account,
	transactions,
	filter,
}: MilhasAccountDetailProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	function handleDelete(id: string) {
		startTransition(async () => {
			const result = await deleteMilhasTransactionAction({ id });
			if (result.success) {
				toast.success(result.message);
				router.refresh();
			} else {
				toast.error(result.error);
			}
		});
	}

	function formatDate(date: Date | null) {
		if (!date) return "—";
		return new Date(date).toLocaleDateString("pt-BR");
	}

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Header */}
			<div className="flex items-start justify-between gap-4">
				<div className="flex items-center gap-3">
					<Button variant="ghost" size="sm" asChild>
						<Link href="/milhas">
							<RiArrowLeftLine className="size-4" />
						</Link>
					</Button>
					<div>
						<p className="text-sm text-muted-foreground">{account.programName}</p>
						<h1 className="text-2xl font-semibold">{account.name}</h1>
					</div>
				</div>
				<MilhasTransactionDialog accountId={account.id} />
			</div>

			{/* Balance card */}
			<Card>
				<CardContent className="py-5">
					<p className="text-sm text-muted-foreground">Saldo atual</p>
					<p className="text-3xl font-semibold tabular-nums mt-1">
						{account.balance.toLocaleString("pt-BR")}{" "}
						<span className="text-base font-normal text-muted-foreground">
							milhas
						</span>
					</p>
				</CardContent>
			</Card>

			{/* Transactions */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Transações</CardTitle>
					{/* Filter buttons */}
					<div className="flex gap-1">
						{FILTER_OPTIONS.map((opt) => (
							<Button
								key={opt.value}
								variant={filter === opt.value ? "secondary" : "ghost"}
								size="sm"
								asChild
							>
								<Link
									href={`/milhas/accounts/${account.id}?filter=${opt.value}`}
								>
									{opt.label}
								</Link>
							</Button>
						))}
					</div>
				</CardHeader>
				<CardContent className="p-0">
					{transactions.length === 0 ? (
						<div className="flex flex-col items-center gap-3 py-10 text-center text-sm text-muted-foreground">
							Nenhuma transação no período.
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Data</TableHead>
									<TableHead>Tipo</TableHead>
									<TableHead className="text-right">Milhas</TableHead>
									<TableHead>Vence em</TableHead>
									<TableHead>Descrição</TableHead>
									<TableHead className="w-10" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{transactions.map((tx) => {
									const isCredit = CREDIT_TYPES.has(tx.type);
									return (
										<TableRow key={tx.id}>
											<TableCell className="text-sm tabular-nums">
												{formatDate(tx.occurredAt)}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														TYPE_BADGE_VARIANT[tx.type as MilhasTransactionType] ??
														"outline"
													}
												>
													{MILHAS_TRANSACTION_TYPE_LABEL[
														tx.type as MilhasTransactionType
													] ?? tx.type}
												</Badge>
											</TableCell>
											<TableCell
												className={`text-right font-medium tabular-nums ${
													isCredit ? "text-emerald-600" : "text-destructive"
												}`}
											>
												{isCredit ? "+" : "−"}
												{tx.amount.toLocaleString("pt-BR")}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground tabular-nums">
												{formatDate(tx.expiresAt)}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
												{tx.description ?? "—"}
											</TableCell>
											<TableCell>
												<Button
													variant="ghost"
													size="icon"
													className="size-7 text-muted-foreground hover:text-destructive"
													disabled={isPending}
													onClick={() => handleDelete(tx.id)}
												>
													<RiDeleteBin5Line className="size-4" />
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
