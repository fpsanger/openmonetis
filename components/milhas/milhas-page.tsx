"use client";

import { RiAddLine, RiArrowRightSLine } from "@remixicon/react";
import Link from "next/link";
import type { MilhasAccountData } from "@/lib/milhas/types";
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
}

export function MilhasPage({ accounts }: MilhasPageProps) {
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
									<TableHead className="text-right">
										Saldo (milhas)
									</TableHead>
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
		</div>
	);
}
