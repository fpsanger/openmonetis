"use client";

import { RiAddLine, RiArrowRightSLine } from "@remixicon/react";
import Link from "next/link";
import type {
	MilhasAccountData,
	MilhasExpirationSummary,
} from "@/lib/milhas/types";
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
	accounts: MilhasAccountData[];
	expirationSummary: MilhasExpirationSummary;
}

function formatBrl(value: number): string {
	return value.toLocaleString("pt-BR", {
		style: "currency",
		currency: "BRL",
	});
}

function formatLocalDate(isoDate: string): string {
	// Append a time component to avoid UTC-offset shifts when parsing a date-only string
	return new Date(`${isoDate}T00:00:00`).toLocaleDateString("pt-BR");
}

export function MilhasPage({ accounts, expirationSummary }: MilhasPageProps) {
	const { totals, byAccount } = expirationSummary;
	const hasExpiring = totals.expiring90 > 0;

	// Show estimated-value column only when at least one account has a reference value set
	const hasRefValues = accounts.some((a) => a.referenceValuePer1000Brl !== null);

	return (
		<div className="flex flex-col gap-6 w-full">
			<div className="flex items-center justify-between">
				<h1 className="text-2xl font-semibold">Milhas</h1>
				<Button asChild size="sm">
					<Link href="/milhas/accounts/new">
						<RiAddLine className="size-4" />
						Nova conta
					</Link>
				</Button>
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
						{/* Global totals per window */}
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

						{/* Per-account breakdown */}
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
											<TableCell className="text-right tabular-nums">
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

			{/* ── Accounts list ──────────────────────────────────────────────── */}
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
						<CardTitle className="text-base">Contas de milhas</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Programa</TableHead>
									<TableHead>Conta</TableHead>
									<TableHead className="text-right">Saldo (milhas)</TableHead>
									{hasRefValues && (
										<TableHead className="text-right">
											Valor est. (R$)
										</TableHead>
									)}
									<TableHead className="w-8" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{accounts.map((account) => {
									const estimatedBrl =
										account.referenceValuePer1000Brl !== null
											? (account.balance / 1000) *
												Number.parseFloat(account.referenceValuePer1000Brl)
											: null;

									return (
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
											{hasRefValues && (
												<TableCell className="text-right tabular-nums text-muted-foreground text-sm">
													{estimatedBrl !== null
														? formatBrl(estimatedBrl)
														: "—"}
												</TableCell>
											)}
											<TableCell>
												<Link href={`/milhas/accounts/${account.id}`}>
													<RiArrowRightSLine className="size-4 text-muted-foreground" />
												</Link>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
