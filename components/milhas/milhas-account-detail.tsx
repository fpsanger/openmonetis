"use client";

import {
	RiArrowLeftLine,
	RiCheckLine,
	RiCloseLine,
	RiDeleteBin5Line,
	RiEdit2Line,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
	deleteMilhasTransactionAction,
	updateMilhasProgramReferenceValueAction,
} from "@/app/(dashboard)/milhas/actions";
import {
	CREDIT_TYPES,
	MILHAS_FILTER_OPTIONS,
	MILHAS_TRANSACTION_TYPE_LABEL,
	MILHAS_TYPE_BADGE_VARIANT,
} from "@/lib/milhas/constants";
import type {
	MilhasAccountData,
	MilhasCostBasis,
	MilhasRedemptionMetric,
	MilhasTransactionData,
	MilhasTransactionFilter,
	MilhasTransactionType,
} from "@/lib/milhas/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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

interface MilhasAccountDetailProps {
	account: MilhasAccountData;
	transactions: MilhasTransactionData[];
	filter: MilhasTransactionFilter;
	costBasis: MilhasCostBasis;
	expiring90: number;
	redemptionMetrics: MilhasRedemptionMetric[];
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatBrl(value: number | null): string {
	if (value === null) return "—";
	return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatDate(date: Date | null | undefined): string {
	if (!date) return "—";
	return new Date(date).toLocaleDateString("pt-BR");
}

function formatRoi(roiPercent: number | null): string {
	if (roiPercent === null) return "—";
	const sign = roiPercent >= 0 ? "+" : "";
	return `${sign}${roiPercent.toFixed(1)}%`;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MilhasAccountDetail({
	account,
	transactions,
	filter,
	costBasis,
	expiring90,
	redemptionMetrics,
}: MilhasAccountDetailProps) {
	const router = useRouter();
	const [isDeletePending, startDeleteTransition] = useTransition();
	const [editingTx, setEditingTx] = useState<MilhasTransactionData | null>(
		null,
	);

	// ── Reference-value inline edit ──────────────────────────────────────────
	const [editingRef, setEditingRef] = useState(false);
	const [refInput, setRefInput] = useState("");
	const [isRefPending, startRefTransition] = useTransition();

	function openRefEdit() {
		setRefInput(account.referenceValuePer1000Brl ?? "");
		setEditingRef(true);
	}

	function cancelRefEdit() {
		setEditingRef(false);
	}

	function handleSaveRef() {
		startRefTransition(async () => {
			const result = await updateMilhasProgramReferenceValueAction({
				id: account.programId,
				referenceValuePer1000Brl: refInput || undefined,
			});
			if (result.success) {
				toast.success(result.message);
				setEditingRef(false);
				router.refresh();
			} else {
				toast.error(result.error);
			}
		});
	}

	// ── Delete transaction ───────────────────────────────────────────────────
	function handleDelete(id: string) {
		startDeleteTransition(async () => {
			const result = await deleteMilhasTransactionAction({ id });
			if (result.success) {
				toast.success(result.message);
				router.refresh();
			} else {
				toast.error(result.error);
			}
		});
	}

	// ── Derived values ───────────────────────────────────────────────────────
	const refValue = account.referenceValuePer1000Brl !== null
		? Number.parseFloat(account.referenceValuePer1000Brl)
		: null;

	const estimatedBrl =
		refValue !== null ? (account.balance / 1000) * refValue : null;

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* ── Header ────────────────────────────────────────────────────── */}
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

			{/* ── Metrics grid ──────────────────────────────────────────────── */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				{/* Saldo */}
				<Card>
					<CardContent className="py-5">
						<p className="text-xs text-muted-foreground">Saldo atual</p>
						<p className="text-2xl font-semibold tabular-nums mt-1">
							{account.balance.toLocaleString("pt-BR")}
						</p>
						<p className="text-xs text-muted-foreground">milhas</p>
					</CardContent>
				</Card>

				{/* Custo médio por 1 000 milhas */}
				<Card>
					<CardContent className="py-5">
						<p className="text-xs text-muted-foreground">Custo médio/1.000</p>
						<p className="text-2xl font-semibold tabular-nums mt-1">
							{costBasis.avgCostPer1000 !== null
								? formatBrl(costBasis.avgCostPer1000)
								: "—"}
						</p>
						<p className="text-xs text-muted-foreground">
							{costBasis.totalCreditedMiles > 0
								? `${costBasis.totalCreditedMiles.toLocaleString("pt-BR")} milhas pagas`
								: "sem milhas pagas"}
						</p>
					</CardContent>
				</Card>

				{/* Valor estimado */}
				<Card>
					<CardContent className="py-5">
						<p className="text-xs text-muted-foreground">Valor estimado</p>
						<p className="text-2xl font-semibold tabular-nums mt-1">
							{estimatedBrl !== null ? formatBrl(estimatedBrl) : "—"}
						</p>
						<p className="text-xs text-muted-foreground">
							{refValue !== null
								? `ref. ${formatBrl(refValue)}/1.000`
								: "referência não configurada"}
						</p>
					</CardContent>
				</Card>

				{/* Expirando em 90 dias */}
				<Card>
					<CardContent className="py-5">
						<p className="text-xs text-muted-foreground">Expiram em 90d</p>
						<p
							className={`text-2xl font-semibold tabular-nums mt-1 ${expiring90 > 0 ? "text-amber-600" : ""}`}
						>
							{expiring90.toLocaleString("pt-BR")}
						</p>
						<p className="text-xs text-muted-foreground">milhas</p>
					</CardContent>
				</Card>
			</div>

			{/* ── Program reference value edit ──────────────────────────────── */}
			<div className="flex items-center gap-2 text-sm">
				<span className="text-muted-foreground">
					Referência do programa:
				</span>
				{editingRef ? (
					<>
						<Input
							className="h-7 w-32 text-sm"
							type="text"
							inputMode="decimal"
							placeholder="Ex.: 30,00"
							value={refInput}
							onChange={(e) => setRefInput(e.target.value)}
							disabled={isRefPending}
							autoFocus
						/>
						<span className="text-muted-foreground text-xs">R$/1.000 milhas</span>
						<Button
							size="icon"
							variant="ghost"
							className="size-6"
							onClick={handleSaveRef}
							disabled={isRefPending}
						>
							<RiCheckLine className="size-3.5" />
						</Button>
						<Button
							size="icon"
							variant="ghost"
							className="size-6"
							onClick={cancelRefEdit}
							disabled={isRefPending}
						>
							<RiCloseLine className="size-3.5" />
						</Button>
					</>
				) : (
					<>
						<span className="font-medium">
							{refValue !== null
								? `${formatBrl(refValue)} / 1.000 milhas`
								: "não configurada"}
						</span>
						<Button
							size="icon"
							variant="ghost"
							className="size-6"
							onClick={openRefEdit}
						>
							<RiEdit2Line className="size-3.5 text-muted-foreground" />
						</Button>
					</>
				)}
			</div>

			{/* ── Redemption metrics ────────────────────────────────────────── */}
			{redemptionMetrics.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle className="text-base">Últimos resgates</CardTitle>
					</CardHeader>
					<CardContent className="p-0">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Data</TableHead>
									<TableHead>Descrição</TableHead>
									<TableHead className="text-right">Milhas</TableHead>
									<TableHead className="text-right">Valor (R$)</TableHead>
									<TableHead className="text-right">R$/1.000</TableHead>
									<TableHead className="text-right">ROI</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{redemptionMetrics.map((r) => (
									<TableRow key={r.id}>
										<TableCell className="text-sm tabular-nums">
											{formatDate(r.occurredAt)}
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

			{/* ── Transactions ──────────────────────────────────────────────── */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<CardTitle className="text-base">Transações</CardTitle>
					{/* Filter buttons */}
					<div className="flex gap-1">
						{MILHAS_FILTER_OPTIONS.map((opt) => (
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
									<TableHead className="text-right">R$</TableHead>
									<TableHead>Vence em</TableHead>
									<TableHead>Descrição</TableHead>
									<TableHead className="w-20" />
								</TableRow>
							</TableHeader>
							<TableBody>
								{transactions.map((tx) => {
									const isCredit = CREDIT_TYPES.has(tx.type);

									// "R$" column: costBrl for credits, cashEquivalentBrl for REDEEM
									const brlDisplay =
										isCredit && tx.costBrl !== null
											? formatBrl(Number.parseFloat(tx.costBrl))
											: tx.type === "REDEEM" && tx.cashEquivalentBrl !== null
												? formatBrl(Number.parseFloat(tx.cashEquivalentBrl))
												: "—";

									return (
										<TableRow key={tx.id}>
											<TableCell className="text-sm tabular-nums">
												{formatDate(tx.occurredAt)}
											</TableCell>
											<TableCell>
												<Badge
													variant={
														MILHAS_TYPE_BADGE_VARIANT[
															tx.type as MilhasTransactionType
														] ?? "outline"
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
											<TableCell className="text-right text-sm tabular-nums text-muted-foreground">
												{brlDisplay}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground tabular-nums">
												{formatDate(tx.expiresAt)}
											</TableCell>
											<TableCell className="text-sm text-muted-foreground max-w-[180px] truncate">
												{tx.description ?? "—"}
											</TableCell>
											<TableCell>
												<div className="flex items-center gap-0.5">
													<Button
														variant="ghost"
														size="icon"
														className="size-7 text-muted-foreground hover:text-foreground"
														onClick={() => setEditingTx(tx)}
													>
														<RiEdit2Line className="size-4" />
													</Button>
													<Button
														variant="ghost"
														size="icon"
														className="size-7 text-muted-foreground hover:text-destructive"
														disabled={isDeletePending}
														onClick={() => handleDelete(tx.id)}
													>
														<RiDeleteBin5Line className="size-4" />
													</Button>
												</div>
											</TableCell>
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					)}
				</CardContent>
			</Card>

			{/* Edit transaction dialog — controlled, opened from row pencil button */}
			<MilhasTransactionDialog
				accountId={account.id}
				transaction={editingTx ?? undefined}
				open={editingTx !== null}
				onOpenChange={(v) => {
					if (!v) setEditingTx(null);
				}}
			/>
		</div>
	);
}
