"use client";

import { RiFilter3Line } from "@remixicon/react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import {
	MILHAS_TRANSACTION_TYPE_LABEL,
	MILHAS_TRANSACTION_TYPES,
} from "@/lib/milhas/constants";
import { Button } from "@/components/ui/button";
import {
	Drawer,
	DrawerContent,
	DrawerDescription,
	DrawerFooter,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

const PARAM_ALL = "__all";

export function MilhasTransactionFilters() {
	const router = useRouter();
	const pathname = usePathname();
	const searchParams = useSearchParams();
	const [isPending, startTransition] = useTransition();
	const [drawerOpen, setDrawerOpen] = useState(false);

	const get = (key: string) => searchParams.get(key) ?? PARAM_ALL;

	const setParam = useCallback(
		(key: string, value: string | null) => {
			const next = new URLSearchParams(searchParams.toString());
			if (value && value !== PARAM_ALL) {
				next.set(key, value);
			} else {
				next.delete(key);
			}
			startTransition(() => {
				router.replace(`${pathname}?${next.toString()}`, { scroll: false });
			});
		},
		[searchParams, pathname, router],
	);

	// Debounced description search
	const [searchValue, setSearchValue] = useState(searchParams.get("q") ?? "");
	const currentQ = searchParams.get("q") ?? "";

	useEffect(() => {
		setSearchValue(currentQ);
	}, [currentQ]);

	useEffect(() => {
		if (searchValue === currentQ) return;
		const t = setTimeout(() => {
			setParam("q", searchValue.trim() || null);
		}, 350);
		return () => clearTimeout(t);
	}, [searchValue, currentQ, setParam]);

	const hasActiveFilters =
		searchParams.has("type") ||
		searchParams.has("filter") ||
		searchParams.has("expires") ||
		searchParams.has("hasCost") ||
		searchParams.has("hasCashEq") ||
		searchParams.has("sort") ||
		searchParams.has("sortDir");

	const handleReset = () => {
		setSearchValue("");
		setDrawerOpen(false);
		startTransition(() => {
			router.replace(pathname, { scroll: false });
		});
	};

	return (
		<div className="flex flex-col gap-2 md:flex-row md:items-center">
			<Input
				value={searchValue}
				onChange={(e) => setSearchValue(e.target.value)}
				placeholder="Buscar por descrição"
				className="w-full md:w-[240px] text-sm border-dashed"
			/>

			<Drawer direction="right" open={drawerOpen} onOpenChange={setDrawerOpen}>
				<DrawerTrigger asChild>
					<Button
						variant="outline"
						className="text-sm border-dashed relative"
						aria-label="Abrir filtros"
					>
						<RiFilter3Line className="size-4" />
						Filtros
						{hasActiveFilters && (
							<span className="absolute -top-1 -right-1 size-2 rounded-full bg-primary" />
						)}
					</Button>
				</DrawerTrigger>

				<DrawerContent>
					<DrawerHeader>
						<DrawerTitle>Filtros e ordenação</DrawerTitle>
						<DrawerDescription>
							Refine e ordene as transações exibidas
						</DrawerDescription>
					</DrawerHeader>

					<div className="flex-1 overflow-y-auto px-4 space-y-4">
						{/* Período */}
						<div className="space-y-2">
							<Label>Período</Label>
							<Select
								value={get("filter")}
								onValueChange={(v) =>
									setParam("filter", v === "30" || v === PARAM_ALL ? null : v)
								}
								disabled={isPending}
							>
								<SelectTrigger className="w-full border-dashed">
									<SelectValue placeholder="Últimos 30 dias" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="30">Últimos 30 dias</SelectItem>
									<SelectItem value="90">Últimos 90 dias</SelectItem>
									<SelectItem value="all">Todas</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Tipo */}
						<div className="space-y-2">
							<Label>Tipo de transação</Label>
							<Select
								value={get("type")}
								onValueChange={(v) =>
									setParam("type", v === PARAM_ALL ? null : v)
								}
								disabled={isPending}
							>
								<SelectTrigger className="w-full border-dashed">
									<SelectValue placeholder="Todos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={PARAM_ALL}>Todos</SelectItem>
									{MILHAS_TRANSACTION_TYPES.map((t) => (
										<SelectItem key={t} value={t}>
											{MILHAS_TRANSACTION_TYPE_LABEL[t]}
										</SelectItem>
									))}
								</SelectContent>
							</Select>
						</div>

						{/* Vencimento */}
						<div className="space-y-2">
							<Label>Vencimento</Label>
							<Select
								value={get("expires")}
								onValueChange={(v) =>
									setParam("expires", v === PARAM_ALL ? null : v)
								}
								disabled={isPending}
							>
								<SelectTrigger className="w-full border-dashed">
									<SelectValue placeholder="Todos" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={PARAM_ALL}>Todos</SelectItem>
									<SelectItem value="30">Expira em 30 dias</SelectItem>
									<SelectItem value="60">Expira em 60 dias</SelectItem>
									<SelectItem value="90">Expira em 90 dias</SelectItem>
									<SelectItem value="expired">Expirada</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Com custo */}
						<div className="space-y-2">
							<Label>Custo (R$)</Label>
							<Select
								value={searchParams.has("hasCost") ? "1" : PARAM_ALL}
								onValueChange={(v) =>
									setParam("hasCost", v === PARAM_ALL ? null : v)
								}
								disabled={isPending}
							>
								<SelectTrigger className="w-full border-dashed">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={PARAM_ALL}>Todos</SelectItem>
									<SelectItem value="1">Com custo registrado</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Com valor equivalente */}
						<div className="space-y-2">
							<Label>Valor equivalente (R$)</Label>
							<Select
								value={searchParams.has("hasCashEq") ? "1" : PARAM_ALL}
								onValueChange={(v) =>
									setParam("hasCashEq", v === PARAM_ALL ? null : v)
								}
								disabled={isPending}
							>
								<SelectTrigger className="w-full border-dashed">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={PARAM_ALL}>Todos</SelectItem>
									<SelectItem value="1">Com valor equivalente</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Ordenar por */}
						<div className="space-y-2">
							<Label>Ordenar por</Label>
							<Select
								value={get("sort")}
								onValueChange={(v) =>
									setParam("sort", v === PARAM_ALL ? null : v)
								}
								disabled={isPending}
							>
								<SelectTrigger className="w-full border-dashed">
									<SelectValue placeholder="Data (padrão)" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={PARAM_ALL}>Data (padrão)</SelectItem>
									<SelectItem value="occurredAt">Data</SelectItem>
									<SelectItem value="amount">Milhas</SelectItem>
									<SelectItem value="expiresAt">Vencimento</SelectItem>
									<SelectItem value="costBrl">Custo (R$)</SelectItem>
									<SelectItem value="cashEquivalentBrl">
										Valor equiv. (R$)
									</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Ordem */}
						<div className="space-y-2">
							<Label>Ordem</Label>
							<Select
								value={get("sortDir")}
								onValueChange={(v) =>
									setParam("sortDir", v === PARAM_ALL ? null : v)
								}
								disabled={isPending}
							>
								<SelectTrigger className="w-full border-dashed">
									<SelectValue placeholder="Decrescente" />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value={PARAM_ALL}>Decrescente</SelectItem>
									<SelectItem value="desc">Decrescente</SelectItem>
									<SelectItem value="asc">Crescente</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<DrawerFooter>
						<Button
							type="button"
							variant="outline"
							onClick={handleReset}
							disabled={
								isPending || (!hasActiveFilters && !searchParams.has("q"))
							}
						>
							Limpar filtros
						</Button>
					</DrawerFooter>
				</DrawerContent>
			</Drawer>
		</div>
	);
}
