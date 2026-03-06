"use client";

import { RiAddLine, RiArrowLeftLine } from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
	createMilhasAccountAction,
	createMilhasProgramAction,
} from "@/app/(dashboard)/milhas/actions";
import type { MilhasProgramData } from "@/lib/milhas/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

interface MilhasAccountNewFormProps {
	programs: MilhasProgramData[];
}

export function MilhasAccountNewForm({ programs }: MilhasAccountNewFormProps) {
	const router = useRouter();
	const [isPending, startTransition] = useTransition();

	const [programId, setProgramId] = useState("");
	const [accountName, setAccountName] = useState("");

	// New-program dialog state
	const [programDialogOpen, setProgramDialogOpen] = useState(false);
	const [newProgramName, setNewProgramName] = useState("");
	const [isProgramPending, startProgramTransition] = useTransition();

	// Local programs list so the select updates after creating a program
	const [localPrograms, setLocalPrograms] =
		useState<MilhasProgramData[]>(programs);

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		startTransition(async () => {
			const result = await createMilhasAccountAction({
				name: accountName,
				programId,
			});
			if (result.success) {
				toast.success(result.message);
				router.push("/milhas");
			} else {
				toast.error(result.error);
			}
		});
	}

	function handleCreateProgram(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		startProgramTransition(async () => {
			const result = await createMilhasProgramAction({ name: newProgramName });
			if (result.success && result.data) {
				const newProgram: MilhasProgramData = {
					...result.data,
					referenceValuePer1000Brl: null, // new programs start with no reference value
				};
				setLocalPrograms((prev) =>
					[...prev, newProgram].sort((a, b) =>
						a.name.localeCompare(b.name),
					),
				);
				setProgramId(result.data.id);
				setNewProgramName("");
				setProgramDialogOpen(false);
				toast.success(result.message);
			} else if (!result.success) {
				toast.error(result.error);
			}
		});
	}

	return (
		<div className="flex flex-col gap-6 w-full max-w-lg">
			<div className="flex items-center gap-3">
				<Button variant="ghost" size="sm" asChild>
					<Link href="/milhas">
						<RiArrowLeftLine className="size-4" />
					</Link>
				</Button>
				<h1 className="text-2xl font-semibold">Nova conta de milhas</h1>
			</div>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Dados da conta</CardTitle>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="flex flex-col gap-5">
						<div className="flex flex-col gap-2">
							<Label htmlFor="program">Programa de milhas</Label>
							<div className="flex gap-2">
								<Select value={programId} onValueChange={setProgramId} required>
									<SelectTrigger id="program" className="flex-1">
										<SelectValue placeholder="Selecione um programa" />
									</SelectTrigger>
									<SelectContent>
										{localPrograms.length === 0 ? (
											<SelectItem value="__none__" disabled>
												Nenhum programa cadastrado
											</SelectItem>
										) : (
											localPrograms.map((p) => (
												<SelectItem key={p.id} value={p.id}>
													{p.name}
												</SelectItem>
											))
										)}
									</SelectContent>
								</Select>

								<Dialog
									open={programDialogOpen}
									onOpenChange={setProgramDialogOpen}
								>
									<DialogTrigger asChild>
										<Button variant="outline" size="icon" type="button">
											<RiAddLine className="size-4" />
										</Button>
									</DialogTrigger>
									<DialogContent className="sm:max-w-sm">
										<DialogHeader>
											<DialogTitle>Novo programa</DialogTitle>
										</DialogHeader>
										<form
											onSubmit={handleCreateProgram}
											className="flex flex-col gap-4"
										>
											<div className="flex flex-col gap-2">
												<Label htmlFor="new-program-name">Nome</Label>
												<Input
													id="new-program-name"
													placeholder="Ex.: Livelo, Smiles, Latam Pass"
													value={newProgramName}
													onChange={(e) => setNewProgramName(e.target.value)}
													required
													maxLength={100}
												/>
											</div>
											<DialogFooter>
												<Button
													type="submit"
													disabled={isProgramPending}
													className="w-full"
												>
													{isProgramPending ? "Salvando..." : "Criar programa"}
												</Button>
											</DialogFooter>
										</form>
									</DialogContent>
								</Dialog>
							</div>
						</div>

						<div className="flex flex-col gap-2">
							<Label htmlFor="account-name">Nome da conta</Label>
							<Input
								id="account-name"
								placeholder="Ex.: Minha Smiles, Livelo pessoal"
								value={accountName}
								onChange={(e) => setAccountName(e.target.value)}
								required
								maxLength={100}
							/>
						</div>

						<Button
							type="submit"
							disabled={isPending || !programId}
							className="mt-2"
						>
							{isPending ? "Criando..." : "Criar conta"}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
