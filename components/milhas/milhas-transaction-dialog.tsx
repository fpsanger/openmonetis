"use client";

import { RiAddLine } from "@remixicon/react";
import { useState, useTransition } from "react";
import { createMilhasTransactionAction } from "@/app/(dashboard)/milhas/actions";
import {
	CREDIT_TYPES,
	MILHAS_TRANSACTION_TYPE_LABEL,
	MILHAS_TRANSACTION_TYPES,
} from "@/lib/milhas/constants";
import type { MilhasTransactionType } from "@/lib/milhas/types";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface MilhasTransactionDialogProps {
	accountId: string;
}

const EMPTY_FORM = {
	type: "EARN" as MilhasTransactionType,
	amount: "",
	occurredAt: new Date().toISOString().split("T")[0],
	expiresAt: "",
	description: "",
	/** BRL paid to acquire these miles (shown only for EARN / ADJUST). */
	costBrl: "",
	/** Cash-equivalent value of the redemption (shown only for REDEEM). */
	cashEquivalentBrl: "",
};

export function MilhasTransactionDialog({
	accountId,
}: MilhasTransactionDialogProps) {
	const [open, setOpen] = useState(false);
	const [isPending, startTransition] = useTransition();
	const [form, setForm] = useState(EMPTY_FORM);

	function updateField<K extends keyof typeof EMPTY_FORM>(
		field: K,
		value: (typeof EMPTY_FORM)[K],
	) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	function handleTypeChange(v: string) {
		setForm((prev) => ({
			...prev,
			type: v as MilhasTransactionType,
			// Clear monetary fields when switching type to avoid stale values
			costBrl: "",
			cashEquivalentBrl: "",
		}));
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const amount = Number.parseInt(form.amount, 10);
		if (Number.isNaN(amount) || amount <= 0) {
			toast.error("Informe uma quantidade válida de milhas.");
			return;
		}
		startTransition(async () => {
			const result = await createMilhasTransactionAction({
				accountId,
				type: form.type,
				amount,
				occurredAt: form.occurredAt,
				expiresAt: form.expiresAt || null,
				description: form.description || null,
				costBrl: form.costBrl || undefined,
				cashEquivalentBrl: form.cashEquivalentBrl || undefined,
			});
			if (result.success) {
				toast.success(result.message);
				setForm(EMPTY_FORM);
				setOpen(false);
			} else {
				toast.error(result.error);
			}
		});
	}

	const isCredit = CREDIT_TYPES.has(form.type);

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">
					<RiAddLine className="size-4" />
					Nova transação
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-sm">
				<DialogHeader>
					<DialogTitle>Nova transação</DialogTitle>
				</DialogHeader>
				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					<div className="flex flex-col gap-2">
						<Label htmlFor="tx-type">Tipo</Label>
						<Select value={form.type} onValueChange={handleTypeChange}>
							<SelectTrigger id="tx-type">
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{MILHAS_TRANSACTION_TYPES.map((type) => (
									<SelectItem key={type} value={type}>
										{MILHAS_TRANSACTION_TYPE_LABEL[type]}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="tx-amount">Milhas</Label>
						<Input
							id="tx-amount"
							type="number"
							min={1}
							step={1}
							placeholder="Ex.: 5000"
							value={form.amount}
							onChange={(e) => updateField("amount", e.target.value)}
							required
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="tx-date">Data</Label>
						<Input
							id="tx-date"
							type="date"
							value={form.occurredAt}
							onChange={(e) => updateField("occurredAt", e.target.value)}
							required
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="tx-expires">
							Vence em{" "}
							<span className="text-muted-foreground font-normal">(opcional)</span>
						</Label>
						<Input
							id="tx-expires"
							type="date"
							value={form.expiresAt}
							onChange={(e) => updateField("expiresAt", e.target.value)}
						/>
					</div>

					<div className="flex flex-col gap-2">
						<Label htmlFor="tx-desc">
							Descrição{" "}
							<span className="text-muted-foreground font-normal">(opcional)</span>
						</Label>
						<Input
							id="tx-desc"
							placeholder="Ex.: Compra passagem TAM"
							value={form.description}
							onChange={(e) => updateField("description", e.target.value)}
							maxLength={255}
						/>
					</div>

					{/* Custo (BRL) — credit types only */}
					{isCredit && (
						<div className="flex flex-col gap-2">
							<Label htmlFor="tx-cost">
								Custo{" "}
								<span className="text-muted-foreground font-normal">
									(R$, opcional)
								</span>
							</Label>
							<Input
								id="tx-cost"
								type="text"
								inputMode="decimal"
								placeholder="Ex.: 50,00"
								value={form.costBrl}
								onChange={(e) => updateField("costBrl", e.target.value)}
							/>
						</div>
					)}

					{/* Cash equivalent — REDEEM only */}
					{form.type === "REDEEM" && (
						<div className="flex flex-col gap-2">
							<Label htmlFor="tx-cash-eq">
								Valor equivalente{" "}
								<span className="text-muted-foreground font-normal">
									(R$, opcional)
								</span>
							</Label>
							<Input
								id="tx-cash-eq"
								type="text"
								inputMode="decimal"
								placeholder="Ex.: 120,00"
								value={form.cashEquivalentBrl}
								onChange={(e) =>
									updateField("cashEquivalentBrl", e.target.value)
								}
							/>
						</div>
					)}

					<DialogFooter>
						<Button type="submit" disabled={isPending} className="w-full">
							{isPending ? "Salvando..." : "Registrar"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
