"use client";

import {
	RiAddLine,
	RiArrowRightSLine,
	RiBarChart2Line,
	RiCoinLine,
	RiMoneyDollarCircleLine,
	RiTimeLine,
} from "@remixicon/react";
import Link from "next/link";
import type {
	MilhasAccountWithMetrics,
	MilhasDashboardSummary,
	MilhasExpirationSummary,
	MilhasRedemptionMetricWithAccount,
} from "@/lib/milhas/types";
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

interface MilhasPageProps {
	summary: MilhasDashboardSummary;
	accounts: MilhasAccountWithMetrics[];
	redemptions: MilhasRedemptionMetricWithAccount[];
	expirationSummary: MilhasExpirationSummary;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatBrl(value: number | null): string {
	if (value === null) return "—";
	return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatLocalDate(isoDate: string): string {
	return new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR");
}

function formatDate(date: Date): string {
	return new Date(date).toLocaleDateString("pt-BR");
}

function formatRoi(roiPercent: number | null): string {
	if (roiPercent === null) return "—";
	const sign = roiPercent >= 0 ? "+" : "";
	return `${sign}${roiPercent.toFixed(1)}%`;
}

// ─── Summary cards ────────────────────────────────────────────────────────────

const SUMMARY_CARDS = [
	{
		key: "totalBalance" as const,
		label: "Total de milhas",
		icon: RiCoinLine,
		format: (v: number | null) =>
			v !== null ? v.toLocaleString("pt-BR") : "—",
		unit: "milhas",
		accent: false,
	},
	{
		key: "avgCostPer1000" as const,
		label: "Custo médio/1.000",
		icon: RiBarChart2Line,
		format: formatBrl,
		unit: "por 1.000 milhas",
		accent: false,
	},
	{
		key: "estimatedValueBrl" as const,
		label: "Valor estimado",
		icon: RiMoneyDollarCircleLine,
		format: formatBrl,
		unit: "valor de mercado",
		accent: false,
	},
	{
		key: "expiring90" as const,
		label: "Expiram em 90d",
		icon: RiTimeLine,
		format: (v: number | null) =>
			v !== null ? v.toLocaleString("pt-BR") : "—",
		unit: "milhas",
		accent: true,
	},
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export function MilhasPage({
	summary,
	accounts,
	redemptions,
	expirationSummary,
}: MilhasPageProps) {
	const { totals, byAccount } = expirationSummary;
	const hasExpiring = totals.expiring90 > 0;
	const hasRedemptions = redemptions.length > 0;
	const hasRefValues = accounts.some((a) => a.referenceValuePer1000Brl !== null);

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* ── Header ────────────────────────────────────────────────────── */}
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Milhas</h1>
				<Button asChild size="sm">
					<Link href="/milhas/accounts/new">
						<RiAddLine className="size-4" />
						Nova conta
					</Link>
				</Button>
			</div>

			{/* ── Summary cards ─────────────────────────────────────────────── */}
			<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
				{SUMMARY_CARDS.map(({ key, label, icon: Icon, format, unit, accent }) => {
					const value = summary[key];
					const isAmber = accent && typeof value === "number" && value > 0;
					return (
						<Card key={key}>
							<CardContent className="px-4 py-4">
								<div className="flex items-start justify-between gap-3">
									<div className="space-y-1 min-w-0">
										<p className="text-xs font-medium text-muted-foreground">
											{label}
										</p>
										<p
											className={`text-2xl font-semibold tabular-nums truncate ${isAmber ? "text-amber-600" : ""}`}
										>
											{format(value as number | null)}
										</p>
										<p className="text-xs text-muted-foreground">{unit}</p>
									</div>
									<Icon className="size-5 text-muted-foreground shrink-0 mt-0.5" />
								</div>
							</CardContent>
						</Card>
					);
				})}
			</div>

			{/* ── Expiration summary ─────────────────────────────────────────── */}
			{hasExpiring && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base text-amber-600">
							Milhas a vencer
						</CardTitle>
					</CardHeader>
					<CardContent className="flex flex-col gap-4">
						<div className="grid grid-cols-3 gap-4 text-center">
							{[
								{ label: "30 dias", value: totals.expiring30 },
								{ label: "60 dias", value: totals.expiring60 },
								{ label: "90 dias", value: totals.expiring90 },
							].map(({ label, value }) => (
								<div key={label}>
									<p className="text-xs text-muted-foreground">{label}</p>
									<p className="text-2xl font-semibold tabular-nums mt-0.5">
										{value.toLocaleString("pt-BR")}
									</p>
								</div>
							))}
						</div>

						{byAccount.length > 0 && (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Conta</TableHead>
										<TableHead>Programa</TableHead>
										<TableHead className="text-right">Milhas (90d)</TableHead>
										<TableHead>Próx. vencimento</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{byAccount.map((entry) => (
										<TableRow key={entry.accountId}>
											<TableCell className="font-medium">
												<Link
													href={`/milhas/accounts/${entry.accountId}`}
													className="hover:underline"
												>
													{entry.accountName}
												</Link>
											</TableCell>
											<TableCell className="text-sm text-muted-foreground">
												{entry.programName}
											</TableCell>
											<TableCell className="text-right tabular-nums text-amber-600 font-medium">
												{entry.expiring90.toLocaleString("pt-BR")}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground tabular-nums">
												{entry.nextExpiresAt
													? formatLocalDate(entry.nextExpiresAt)
													: "—"}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>
			)}

			{/* ── Portfolio by account ───────────────────────────────────────── */}
			{accounts.length === 0 ? (
				<Card>
					<CardContent className="flex flex-col items-center gap-4 py-12 text-center">
						<p className="text-muted-foreground text-sm">
							Nenhuma conta de milhas cadastrada ainda.
						</p>
						<Button asChild size="sm">
							<Link href="/milhas/accounts/new">
								<RiAddLine className="size-4" />
								Nova conta
							</Link>
						</Button>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Portfolio por conta</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Programa</TableHead>
									<TableHead>Conta</TableHead>
									<TableHead className="text-right">Saldo</TableHead>
									<TableHead className="text-right">Custo/1.000</TableHead>
									{hasRefValues && (
										<TableHead className="text-right">Valor est.</TableHead>
									)}
									<TableHead className="text-right">Expiram (90d)</TableHead>
									<TableHead className="w-8" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{accounts.map((account) => (
									<TableRow key={account.id}>
										<TableCell className="text-muted-foreground text-sm">
											{account.programName}
										</TableCell>
										<TableCell className="font-medium">
											<Link
												href={`/milhas/accounts/${account.id}`}
												className="hover:underline"
											>
												{account.name}
											</Link>
										</TableCell>
										<TableCell className="text-right font-medium tabular-nums">
											{account.balance.toLocaleString("pt-BR")}
										</TableCell>
										<TableCell className="text-right tabular-nums text-sm text-muted-foreground">
											{account.avgCostPer1000 !== null
												? formatBrl(account.avgCostPer1000)
												: "—"}
										</TableCell>
										{hasRefValues && (
											<TableCell className="text-right tabular-nums text-sm text-muted-foreground">
												{account.estimatedValueBrl !== null
													? formatBrl(account.estimatedValueBrl)
													: "—"}
											</TableCell>
										)}
										<TableCell
											className={`text-right tabular-nums text-sm ${account.expiring90 > 0 ? "text-amber-600 font-medium" : "text-muted-foreground"}`}
										>
											{account.expiring90 > 0
												? account.expiring90.toLocaleString("pt-BR")
												: "—"}
										</TableCell>
										<TableCell>
											<Link href={`/milhas/accounts/${account.id}`}>
												<RiArrowRightSLine className="size-4 text-muted-foreground" />
											</Link>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{/* ── Best redemptions ───────────────────────────────────────────── */}
			{hasRedemptions && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Melhores resgates</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Data</TableHead>
									<TableHead>Conta</TableHead>
									<TableHead>Descrição</TableHead>
									<TableHead className="text-right">Milhas</TableHead>
									<TableHead className="text-right">Valor (R$)</TableHead>
									<TableHead className="text-right">R$/1.000</TableHead>
									<TableHead className="text-right">ROI</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{redemptions.map((r) => (
									<TableRow key={r.id}>
										<TableCell className="text-sm tabular-nums">
											{formatDate(r.occurredAt)}
										</TableCell>
										<TableCell className="text-sm">
											<Link
												href={`/milhas/accounts/${r.accountId}`}
												className="hover:underline"
											>
												{r.accountName}
											</Link>
										</TableCell>
										<TableCell className="text-sm text-muted-foreground max-w-[160px] truncate">
											{r.description ?? "—"}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{r.amount.toLocaleString("pt-BR")}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatBrl(r.cashEquivalentBrl)}
										</TableCell>
										<TableCell className="text-right tabular-nums">
											{formatBrl(r.valuePer1000)}
										</TableCell>
										<TableCell
											className={`text-right tabular-nums font-medium ${
												r.roiPercent === null
													? "text-muted-foreground"
													: r.roiPercent >= 0
														? "text-emerald-600"
														: "text-destructive"
											}`}
										>
											{formatRoi(r.roiPercent)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
