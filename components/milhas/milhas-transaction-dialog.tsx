"use client";

import { RiAddLine } from "@remixicon/react";
import { useEffect, useState, useTransition } from "react";
import {
	createMilhasTransactionAction,
	updateMilhasTransactionAction,
} from "@/app/(dashboard)/milhas/actions";
import {
	CREDIT_TYPES,
	MILHAS_TRANSACTION_TYPE_LABEL,
	MILHAS_TRANSACTION_TYPES,
} from "@/lib/milhas/constants";
import type {
	MilhasTransactionData,
	MilhasTransactionType,
} from "@/lib/milhas/types";
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
	/** When provided, the dialog operates in edit mode pre-populated with this transaction. */
	transaction?: MilhasTransactionData;
	/** Controlled open state — required when used in edit mode from a parent. */
	open?: boolean;
	onOpenChange?: (open: boolean) => void;
}

const EMPTY_FORM = {
	type: "EARN" as MilhasTransactionType,
	amount: "",
	occurredAt: new Date().toISOString().split("T")[0],
	expiresAt: "",
	description: "",
	costBrl: "",
	cashEquivalentBrl: "",
};

function txToForm(tx: MilhasTransactionData): typeof EMPTY_FORM {
	return {
		type: tx.type,
		amount: tx.amount.toString(),
		occurredAt: new Date(tx.occurredAt).toISOString().split("T")[0],
		expiresAt: tx.expiresAt
			? new Date(tx.expiresAt).toISOString().split("T")[0]
			: "",
		description: tx.description ?? "",
		costBrl: tx.costBrl ?? "",
		cashEquivalentBrl: tx.cashEquivalentBrl ?? "",
	};
}

export function MilhasTransactionDialog({
	accountId,
	transaction,
	open: controlledOpen,
	onOpenChange: controlledOnOpenChange,
}: MilhasTransactionDialogProps) {
	const isEditMode = !!transaction;
	const isControlled = controlledOpen !== undefined;

	const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
	const open = isControlled ? controlledOpen : uncontrolledOpen;
	const setOpen = isControlled
		? (controlledOnOpenChange ?? (() => {}))
		: setUncontrolledOpen;

	const [isPending, startTransition] = useTransition();
	const [form, setForm] = useState(EMPTY_FORM);

	// Sync form when dialog opens: populate from transaction (edit) or reset (create)
	useEffect(() => {
		if (open && transaction) {
			setForm(txToForm(transaction));
		} else if (!open && !transaction) {
			setForm(EMPTY_FORM);
		}
	}, [open, transaction]);

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
			const result = isEditMode
				? await updateMilhasTransactionAction({
						id: transaction.id,
						type: form.type,
						amount,
						occurredAt: form.occurredAt,
						expiresAt: form.expiresAt || null,
						description: form.description || null,
						costBrl: form.costBrl || undefined,
						cashEquivalentBrl: form.cashEquivalentBrl || undefined,
					})
				: await createMilhasTransactionAction({
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
				setOpen(false);
			} else {
				toast.error(result.error);
			}
		});
	}

	const isCredit = CREDIT_TYPES.has(form.type);

	const dialogContent = (
		<DialogContent className="sm:max-w-sm">
			<DialogHeader>
				<DialogTitle>
					{isEditMode ? "Editar transação" : "Nova transação"}
				</DialogTitle>
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
						{isPending
							? "Salvando..."
							: isEditMode
								? "Salvar alterações"
								: "Registrar"}
					</Button>
				</DialogFooter>
			</form>
		</DialogContent>
	);

	// Controlled mode (edit): no trigger button, parent manages open state
	if (isControlled) {
		return (
			<Dialog open={open} onOpenChange={setOpen}>
				{dialogContent}
			</Dialog>
		);
	}

	// Uncontrolled mode (create): renders its own trigger button
	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">
					<RiAddLine className="size-4" />
					Nova transação
				</Button>
			</DialogTrigger>
			{dialogContent}
		</Dialog>
	);
}
