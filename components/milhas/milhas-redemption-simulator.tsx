"use client";

import { RiCalculatorLine, RiErrorWarningLine, RiTimeLine } from "@remixicon/react";
import { useState, useTransition } from "react";
import { simulateMilhasRedemptionAction } from "@/app/(dashboard)/milhas/actions";
import type { MilhasRedemptionSimulation } from "@/lib/milhas/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface MilhasRedemptionSimulatorProps {
	accountId: string;
	accountBalance: number;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function formatBrl(value: number | null): string {
	if (value === null) return "—";
	return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatRoi(roiPercent: number | null): string {
	if (roiPercent === null) return "—";
	const sign = roiPercent >= 0 ? "+" : "";
	return `${sign}${roiPercent.toFixed(1)}%`;
}

function formatDate(iso: string | null): string {
	if (!iso) return "—";
	return new Date(iso).toLocaleDateString("pt-BR");
}

function daysUntil(iso: string | null): number | null {
	if (!iso) return null;
	return Math.floor(
		(new Date(iso).getTime() - Date.now()) / (1000 * 60 * 60 * 24),
	);
}

// ─── Results panel ────────────────────────────────────────────────────────────

function SimulationResults({
	result,
}: {
	result: MilhasRedemptionSimulation;
}) {
	const roiColor =
		result.roiPercent === null
			? "text-muted-foreground"
			: result.roiPercent >= 0
				? "text-emerald-600"
				: "text-destructive";

	const netColor =
		result.netExtractedValue === null
			? "text-muted-foreground"
			: result.netExtractedValue >= 0
				? "text-emerald-600"
				: "text-destructive";

	return (
		<div className="flex flex-col gap-4">
			<Separator />

			{/* ── Key metrics ────────────────────────────────────────────── */}
			<div className="grid grid-cols-2 gap-3">
				<div className="rounded-md border bg-muted/40 p-3">
					<p className="text-xs text-muted-foreground">R$/1.000 milhas</p>
					<p className="text-lg font-semibold tabular-nums mt-0.5">
						{formatBrl(result.valuePer1000)}
					</p>
					{result.avgCostPer1000 !== null && (
						<p className="text-xs text-muted-foreground">
							custo médio: {formatBrl(result.avgCostPer1000)}
						</p>
					)}
				</div>

				<div className="rounded-md border bg-muted/40 p-3">
					<p className="text-xs text-muted-foreground">ROI</p>
					<p className={`text-lg font-semibold tabular-nums mt-0.5 ${roiColor}`}>
						{formatRoi(result.roiPercent)}
					</p>
					{result.avgCostPer1000 === null && (
						<p className="text-xs text-muted-foreground">sem custo de referência</p>
					)}
				</div>

				<div className="rounded-md border bg-muted/40 p-3">
					<p className="text-xs text-muted-foreground">Custo FIFO consumido</p>
					<p className="text-lg font-semibold tabular-nums mt-0.5">
						{formatBrl(result.fifoCostConsumed)}
					</p>
					{result.fifoCostConsumed === null && (
						<p className="text-xs text-muted-foreground">lotes sem custo rastreado</p>
					)}
				</div>

				<div className="rounded-md border bg-muted/40 p-3">
					<p className="text-xs text-muted-foreground">Valor líquido extraído</p>
					<p className={`text-lg font-semibold tabular-nums mt-0.5 ${netColor}`}>
						{formatBrl(result.netExtractedValue)}
					</p>
					<p className="text-xs text-muted-foreground">
						equivalente − custo FIFO
					</p>
				</div>
			</div>

			{/* ── Expiration warning ─────────────────────────────────────── */}
			{result.expiringMilesConsumed > 0 && (
				<div
					className={`flex items-start gap-2 rounded-md border px-3 py-2 text-sm ${
						result.hasUrgentExpirationWarning
							? "border-destructive/50 bg-destructive/5 text-destructive"
							: "border-amber-500/50 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400"
					}`}
				>
					{result.hasUrgentExpirationWarning ? (
						<RiErrorWarningLine className="size-4 shrink-0 mt-0.5" />
					) : (
						<RiTimeLine className="size-4 shrink-0 mt-0.5" />
					)}
					<span>
						{result.expiringMilesConsumed.toLocaleString("pt-BR")} milhas a expirar
						{result.hasUrgentExpirationWarning
							? " em até 30 dias"
							: " em até 90 dias"}{" "}
						seriam consumidas — resgate oportuno.
					</span>
				</div>
			)}

			{/* ── FIFO lot breakdown ────────────────────────────────────── */}
			{result.lotsConsumed.length > 0 && (
				<div className="flex flex-col gap-1.5">
					<p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
						Lotes consumidos (FIFO)
					</p>
					<div className="flex flex-col gap-1">
						{result.lotsConsumed.map((lot) => {
							const days = daysUntil(lot.expiresAt);
							const isExpiringSoon = days !== null && days > 0 && days <= 90;
							const isUrgent = days !== null && days > 0 && days <= 30;

							return (
								<div
									key={lot.lotId}
									className="flex items-center justify-between rounded border bg-muted/30 px-2.5 py-1.5 text-xs"
								>
									<div className="flex items-center gap-2">
										<span className="tabular-nums font-medium">
											{lot.consumedAmount.toLocaleString("pt-BR")} milhas
										</span>
										<span className="text-muted-foreground">
											de {formatDate(lot.occurredAt)}
										</span>
										{isExpiringSoon && (
											<Badge
												variant={isUrgent ? "destructive" : "outline"}
												className={`text-xs px-1 py-0 ${!isUrgent ? "text-amber-600 border-amber-500" : ""}`}
											>
												{days}d
											</Badge>
										)}
									</div>
									<span className="tabular-nums text-muted-foreground">
										{lot.costBrl !== null ? formatBrl(lot.costBrl) : "grátis"}
									</span>
								</div>
							);
						})}
					</div>
				</div>
			)}
		</div>
	);
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MilhasRedemptionSimulator({
	accountId,
	accountBalance,
}: MilhasRedemptionSimulatorProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [milesAmount, setMilesAmount] = useState("");
	const [cashEquivalentBrl, setCashEquivalentBrl] = useState("");
	const [result, setResult] = useState<MilhasRedemptionSimulation | null>(null);

	function handleOpenChange(v: boolean) {
		setOpen(v);
		if (!v) {
			setMilesAmount("");
			setCashEquivalentBrl("");
			setResult(null);
		}
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();

		const miles = Number.parseInt(milesAmount, 10);
		const cash = Number.parseFloat(cashEquivalentBrl.replace(",", "."));

		if (Number.isNaN(miles) || miles <= 0) {
			toast.error("Informe uma quantidade válida de milhas.");
			return;
		}
		if (Number.isNaN(cash) || cash <= 0) {
			toast.error("Informe um valor equivalente válido em R$.");
			return;
		}
		if (miles > accountBalance) {
			toast.error("A quantidade de milhas supera o saldo da conta.");
			return;
		}

		startTransition(async () => {
			const res = await simulateMilhasRedemptionAction({
				accountId,
				milesAmount: miles,
				cashEquivalentBrl: cash,
			});

			if (res.success && res.data) {
				setResult(res.data);
			} else if (!res.success) {
				toast.error(res.error);
			}
		});
	}

	return (
		<Dialog open={open} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm">
					<RiCalculatorLine className="size-4" />
					Simular resgate
				</Button>
			</DialogTrigger>

			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Simular resgate</DialogTitle>
				</DialogHeader>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					{/* Miles amount */}
					<div className="flex flex-col gap-2">
						<Label htmlFor="sim-miles">Milhas a resgatar</Label>
						<Input
							id="sim-miles"
							type="number"
							min={1}
							max={accountBalance}
							step={1}
							placeholder={`Ex.: ${Math.min(10000, accountBalance).toLocaleString("pt-BR")}`}
							value={milesAmount}
							onChange={(e) => {
								setMilesAmount(e.target.value);
								setResult(null);
							}}
							required
						/>
						<p className="text-xs text-muted-foreground">
							Saldo disponível: {accountBalance.toLocaleString("pt-BR")} milhas
						</p>
					</div>

					{/* Cash equivalent */}
					<div className="flex flex-col gap-2">
						<Label htmlFor="sim-cash">Valor equivalente em caixa (R$)</Label>
						<Input
							id="sim-cash"
							type="text"
							inputMode="decimal"
							placeholder="Ex.: 500,00"
							value={cashEquivalentBrl}
							onChange={(e) => {
								setCashEquivalentBrl(e.target.value);
								setResult(null);
							}}
							required
						/>
						<p className="text-xs text-muted-foreground">
							Quanto vale em R$ o que você recebe com esse resgate.
						</p>
					</div>

					<Button type="submit" disabled={isPending} className="w-full">
						{isPending ? "Calculando..." : "Calcular"}
					</Button>
				</form>

				{/* Results */}
				{result && <SimulationResults result={result} />}
			</DialogContent>
		</Dialog>
	);
}
