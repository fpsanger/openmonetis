"use client";

import { RiAddLine } from "@remixicon/react";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
	createMilhasTransactionAction,
	transferMilhasAction,
	updateMilhasTransactionAction,
} from "@/app/(dashboard)/milhas/actions";
import {
	CREDIT_TYPES,
	MILHAS_TRANSACTION_TYPE_LABEL,
	SELECTABLE_TRANSACTION_TYPES,
} from "@/lib/milhas/constants";
import type {
	MilhasAccountData,
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
	/** Other accounts available as transfer destinations. */
	otherAccounts?: MilhasAccountData[];
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
	// Transfer-specific
	destinationAccountId: "",
	bonusPercent: "",
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
		destinationAccountId: "",
		bonusPercent: "",
	};
}

export function MilhasTransactionDialog({
	accountId,
	otherAccounts = [],
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
			costBrl: "",
			cashEquivalentBrl: "",
			destinationAccountId: "",
			bonusPercent: "",
		}));
	}

	const isTransfer = form.type === "TRANSFER";
	const isCredit = CREDIT_TYPES.has(form.type);

	// Live preview of destination miles
	const destinationMiles = useMemo(() => {
		if (!isTransfer) return null;
		const amount = Number.parseInt(form.amount, 10);
		const bonus = Number.parseFloat(form.bonusPercent || "0");
		if (Number.isNaN(amount) || amount <= 0) return null;
		const bonusPct = Number.isNaN(bonus) || bonus < 0 ? 0 : bonus;
		return Math.round(amount * (1 + bonusPct / 100));
	}, [isTransfer, form.amount, form.bonusPercent]);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		const amount = Number.parseInt(form.amount, 10);
		if (Number.isNaN(amount) || amount <= 0) {
			toast.error("Informe uma quantidade válida de milhas.");
			return;
		}

		if (isTransfer && !isEditMode) {
			if (!form.destinationAccountId) {
				toast.error("Selecione a conta de destino.");
				return;
			}
			const bonusPercent = Number.parseFloat(form.bonusPercent || "0");
			startTransition(async () => {
				const result = await transferMilhasAction({
					sourceAccountId: accountId,
					destinationAccountId: form.destinationAccountId,
					amount,
					bonusPercent: Number.isNaN(bonusPercent) ? 0 : bonusPercent,
					occurredAt: form.occurredAt,
					description: form.description || null,
				});
				if (result.success) {
					toast.success(result.message);
					setOpen(false);
				} else {
					toast.error(result.error);
				}
			});
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

	const dialogContent = (
		<DialogContent className="sm:max-w-sm">
			<DialogHeader>
				<DialogTitle>
					{isEditMode ? "Editar transação" : "Nova transação"}
				</DialogTitle>
			</DialogHeader>
			<form onSubmit={handleSubmit} className="flex flex-col gap-4">
				{/* Type */}
				<div className="flex flex-col gap-2">
					<Label htmlFor="tx-type">Tipo</Label>
					<Select value={form.type} onValueChange={handleTypeChange} disabled={isEditMode}>
						<SelectTrigger id="tx-type">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{SELECTABLE_TRANSACTION_TYPES.map((type) => (
								<SelectItem key={type} value={type}>
									{MILHAS_TRANSACTION_TYPE_LABEL[type]}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				{/* Amount */}
				<div className="flex flex-col gap-2">
					<Label htmlFor="tx-amount">
						{isTransfer ? "Milhas a transferir" : "Milhas"}
					</Label>
					<Input
						id="tx-amount"
						type="number"
						min={1}
						step={1}
						placeholder="Ex.: 50000"
						value={form.amount}
						onChange={(e) => updateField("amount", e.target.value)}
						required
					/>
				</div>

				{/* Transfer-specific fields */}
				{isTransfer && !isEditMode && (
					<>
						<div className="flex flex-col gap-2">
							<Label htmlFor="tx-dest">Conta de destino</Label>
							<Select
								value={form.destinationAccountId}
								onValueChange={(v) => updateField("destinationAccountId", v)}
							>
								<SelectTrigger id="tx-dest">
									<SelectValue placeholder="Selecione..." />
								</SelectTrigger>
								<SelectContent>
									{otherAccounts.length === 0 ? (
										<SelectItem value="__none" disabled>
											Nenhuma outra conta disponível
										</SelectItem>
									) : (
										otherAccounts.map((a) => (
											<SelectItem key={a.id} value={a.id}>
												{a.programName} — {a.name}
											</SelectItem>
										))
									)}
								</SelectContent>
							</Select>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="tx-bonus">
								Bônus{" "}
								<span className="text-muted-foreground font-normal">
									(%, opcional)
								</span>
							</Label>
							<Input
								id="tx-bonus"
								type="number"
								min={0}
								step={0.1}
								placeholder="Ex.: 30"
								value={form.bonusPercent}
								onChange={(e) => updateField("bonusPercent", e.target.value)}
							/>
						</div>

						{/* Live preview */}
						{destinationMiles !== null && (
							<div className="rounded-md bg-muted px-3 py-2 text-sm">
								<span className="text-muted-foreground">Destino recebe: </span>
								<span className="font-semibold tabular-nums">
									{destinationMiles.toLocaleString("pt-BR")} milhas
								</span>
								{Number.parseFloat(form.bonusPercent || "0") > 0 && (
									<span className="text-muted-foreground">
										{" "}
										(+{form.bonusPercent}% bônus)
									</span>
								)}
							</div>
						)}
					</>
				)}

				{/* Date */}
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

				{/* Expiration — not shown for transfers */}
				{!isTransfer && (
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
				)}

				{/* Description */}
				<div className="flex flex-col gap-2">
					<Label htmlFor="tx-desc">
						Descrição{" "}
						<span className="text-muted-foreground font-normal">(opcional)</span>
					</Label>
					<Input
						id="tx-desc"
						placeholder="Ex.: Transferência Livelo → LATAM"
						value={form.description}
						onChange={(e) => updateField("description", e.target.value)}
						maxLength={255}
					/>
				</div>

				{/* Cost (BRL) — credit types only, not for transfer */}
				{isCredit && !isTransfer && (
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
								: isTransfer
									? "Transferir"
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
