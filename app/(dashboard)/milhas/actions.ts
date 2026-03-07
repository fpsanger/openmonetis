"use server";

import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
	milhasAccounts,
	milhasPrograms,
	milhasTransactions,
} from "@/db/schema";
import {
	type ActionResult,
	handleActionError,
	revalidateForEntity,
} from "@/lib/actions/helpers";
import { getUser } from "@/lib/auth/server";
import { db } from "@/lib/db";
import { CREDIT_TYPES, DEBIT_TYPES, MILHAS_TRANSACTION_TYPES } from "@/lib/milhas/constants";
import {
	consumeLotsForTransaction,
	createLotForTransaction,
	lotDeletionCheck,
	releaseLotAllocations,
} from "@/lib/milhas/fifo";
import type { MilhasTransactionType } from "@/lib/milhas/types";
import { uuidSchema } from "@/lib/schemas/common";

// ─── Shared monetary-value schema ─────────────────────────────────────────────

/**
 * Accepts an optional positive decimal string (comma or period as separator).
 * Normalises the separator to a period and returns the value as a string
 * (compatible with Drizzle's numeric columns) or null when the field is blank.
 */
const brlAmountSchema = z
	.string()
	.trim()
	.optional()
	.transform((v) => (v && v.length > 0 ? v.replace(",", ".") : null))
	.refine(
		(v) =>
			v === null ||
			(!Number.isNaN(Number.parseFloat(v)) && Number.parseFloat(v) > 0),
		"Informe um valor positivo.",
	);

// ─── Programs ─────────────────────────────────────────────────────────────────

const programBaseSchema = z.object({
	name: z
		.string({ message: "Informe o nome do programa." })
		.trim()
		.min(1, "Informe o nome do programa.")
		.max(100, "O nome deve ter no máximo 100 caracteres."),
});

const createProgramSchema = programBaseSchema;
const updateProgramSchema = programBaseSchema.extend({
	id: uuidSchema("Programa"),
});
const deleteProgramSchema = z.object({ id: uuidSchema("Programa") });

type ProgramCreateInput = z.infer<typeof createProgramSchema>;
type ProgramUpdateInput = z.infer<typeof updateProgramSchema>;
type ProgramDeleteInput = z.infer<typeof deleteProgramSchema>;

export async function createMilhasProgramAction(
	input: ProgramCreateInput,
): Promise<ActionResult<{ id: string; name: string }>> {
	try {
		const user = await getUser();
		const data = createProgramSchema.parse(input);

		const [created] = await db
			.insert(milhasPrograms)
			.values({ name: data.name, userId: user.id })
			.returning({ id: milhasPrograms.id, name: milhasPrograms.name });

		revalidateForEntity("milhas");
		return {
			success: true,
			message: "Programa criado com sucesso.",
			data: created,
		};
	} catch (error) {
		return handleActionError(error);
	}
}

export async function updateMilhasProgramAction(
	input: ProgramUpdateInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = updateProgramSchema.parse(input);

		const [updated] = await db
			.update(milhasPrograms)
			.set({ name: data.name, updatedAt: new Date() })
			.where(
				and(
					eq(milhasPrograms.id, data.id),
					eq(milhasPrograms.userId, user.id),
				),
			)
			.returning({ id: milhasPrograms.id });

		if (!updated) {
			return { success: false, error: "Programa não encontrado." };
		}

		revalidateForEntity("milhas");
		return { success: true, message: "Programa atualizado com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}

export async function deleteMilhasProgramAction(
	input: ProgramDeleteInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = deleteProgramSchema.parse(input);

		const [deleted] = await db
			.delete(milhasPrograms)
			.where(
				and(
					eq(milhasPrograms.id, data.id),
					eq(milhasPrograms.userId, user.id),
				),
			)
			.returning({ id: milhasPrograms.id });

		if (!deleted) {
			return { success: false, error: "Programa não encontrado." };
		}

		revalidateForEntity("milhas");
		return { success: true, message: "Programa removido com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}

const updateProgramReferenceValueSchema = z.object({
	id: uuidSchema("Programa"),
	referenceValuePer1000Brl: brlAmountSchema,
});

type ProgramReferenceValueInput = z.input<
	typeof updateProgramReferenceValueSchema
>;

/**
 * Sets (or clears) the market reference value per 1 000 miles for a program.
 * Pass an empty string or omit the field to clear the value.
 */
export async function updateMilhasProgramReferenceValueAction(
	input: ProgramReferenceValueInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = updateProgramReferenceValueSchema.parse(input);

		const [updated] = await db
			.update(milhasPrograms)
			.set({
				referenceValuePer1000Brl: data.referenceValuePer1000Brl,
				updatedAt: new Date(),
			})
			.where(
				and(
					eq(milhasPrograms.id, data.id),
					eq(milhasPrograms.userId, user.id),
				),
			)
			.returning({ id: milhasPrograms.id });

		if (!updated) {
			return { success: false, error: "Programa não encontrado." };
		}

		revalidateForEntity("milhas");
		return {
			success: true,
			message: "Valor de referência atualizado com sucesso.",
		};
	} catch (error) {
		return handleActionError(error);
	}
}

// ─── Accounts ─────────────────────────────────────────────────────────────────

const accountBaseSchema = z.object({
	name: z
		.string({ message: "Informe o nome da conta." })
		.trim()
		.min(1, "Informe o nome da conta.")
		.max(100, "O nome deve ter no máximo 100 caracteres."),
	programId: uuidSchema("Programa"),
});

const createAccountSchema = accountBaseSchema;
const updateAccountSchema = accountBaseSchema.extend({
	id: uuidSchema("Conta"),
});
const deleteAccountSchema = z.object({ id: uuidSchema("Conta") });

type AccountCreateInput = z.infer<typeof createAccountSchema>;
type AccountUpdateInput = z.infer<typeof updateAccountSchema>;
type AccountDeleteInput = z.infer<typeof deleteAccountSchema>;

export async function createMilhasAccountAction(
	input: AccountCreateInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = createAccountSchema.parse(input);

		// Verify the program belongs to this user
		const program = await db.query.milhasPrograms.findFirst({
			columns: { id: true },
			where: and(
				eq(milhasPrograms.id, data.programId),
				eq(milhasPrograms.userId, user.id),
			),
		});

		if (!program) {
			return { success: false, error: "Programa não encontrado." };
		}

		await db.insert(milhasAccounts).values({
			name: data.name,
			programId: data.programId,
			userId: user.id,
		});

		revalidateForEntity("milhas");
		return { success: true, message: "Conta criada com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}

export async function updateMilhasAccountAction(
	input: AccountUpdateInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = updateAccountSchema.parse(input);

		// Verify the program belongs to this user
		const program = await db.query.milhasPrograms.findFirst({
			columns: { id: true },
			where: and(
				eq(milhasPrograms.id, data.programId),
				eq(milhasPrograms.userId, user.id),
			),
		});

		if (!program) {
			return { success: false, error: "Programa não encontrado." };
		}

		const [updated] = await db
			.update(milhasAccounts)
			.set({ name: data.name, programId: data.programId, updatedAt: new Date() })
			.where(
				and(
					eq(milhasAccounts.id, data.id),
					eq(milhasAccounts.userId, user.id),
				),
			)
			.returning({ id: milhasAccounts.id });

		if (!updated) {
			return { success: false, error: "Conta não encontrada." };
		}

		revalidateForEntity("milhas");
		return { success: true, message: "Conta atualizada com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}

export async function deleteMilhasAccountAction(
	input: AccountDeleteInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = deleteAccountSchema.parse(input);

		const [deleted] = await db
			.delete(milhasAccounts)
			.where(
				and(
					eq(milhasAccounts.id, data.id),
					eq(milhasAccounts.userId, user.id),
				),
			)
			.returning({ id: milhasAccounts.id });

		if (!deleted) {
			return { success: false, error: "Conta não encontrada." };
		}

		revalidateForEntity("milhas");
		return { success: true, message: "Conta removida com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}

// ─── Transactions ─────────────────────────────────────────────────────────────

const createTransactionSchema = z
	.object({
		accountId: uuidSchema("Conta"),
		type: z.enum(MILHAS_TRANSACTION_TYPES, {
			message: "Tipo de transação inválido.",
		}),
		amount: z
			.number({ message: "Informe a quantidade de milhas." })
			.int("A quantidade deve ser um número inteiro.")
			.positive("A quantidade deve ser maior que zero."),
		occurredAt: z
			.string({ message: "Informe a data." })
			.date("Data inválida."),
		expiresAt: z
			.string()
			.date("Data de expiração inválida.")
			.nullable()
			.optional(),
		description: z
			.string()
			.trim()
			.max(255, "A descrição deve ter no máximo 255 caracteres.")
			.nullable()
			.optional()
			.transform((v) => (v && v.length > 0 ? v : null)),
		/** BRL paid to acquire these miles (EARN / positive ADJUST only). */
		costBrl: brlAmountSchema,
		/** Cash-equivalent value of the redemption in BRL (REDEEM only). */
		cashEquivalentBrl: brlAmountSchema,
	})
	.transform((data) => ({
		...data,
		// Enforce type-based restrictions server-side regardless of what the
		// client sends — costBrl is only meaningful for credit transactions,
		// cashEquivalentBrl only for redemptions.
		costBrl:
			data.type === "EARN" || data.type === "ADJUST"
				? (data.costBrl ?? null)
				: null,
		cashEquivalentBrl:
			data.type === "REDEEM" ? (data.cashEquivalentBrl ?? null) : null,
	}));

const updateTransactionSchema = z
	.object({
		id: uuidSchema("Transação"),
		type: z.enum(MILHAS_TRANSACTION_TYPES, {
			message: "Tipo de transação inválido.",
		}),
		amount: z
			.number({ message: "Informe a quantidade de milhas." })
			.int("A quantidade deve ser um número inteiro.")
			.positive("A quantidade deve ser maior que zero."),
		occurredAt: z
			.string({ message: "Informe a data." })
			.date("Data inválida."),
		expiresAt: z
			.string()
			.date("Data de expiração inválida.")
			.nullable()
			.optional(),
		description: z
			.string()
			.trim()
			.max(255, "A descrição deve ter no máximo 255 caracteres.")
			.nullable()
			.optional()
			.transform((v) => (v && v.length > 0 ? v : null)),
		costBrl: brlAmountSchema,
		cashEquivalentBrl: brlAmountSchema,
	})
	.transform((data) => ({
		...data,
		costBrl:
			data.type === "EARN" || data.type === "ADJUST"
				? (data.costBrl ?? null)
				: null,
		cashEquivalentBrl:
			data.type === "REDEEM" ? (data.cashEquivalentBrl ?? null) : null,
	}));

const deleteTransactionSchema = z.object({ id: uuidSchema("Transação") });

// z.input gives the pre-transform shape (what the client passes in)
type TransactionCreateInput = z.input<typeof createTransactionSchema>;
type TransactionUpdateInput = z.input<typeof updateTransactionSchema>;
type TransactionDeleteInput = z.infer<typeof deleteTransactionSchema>;

export async function createMilhasTransactionAction(
	input: TransactionCreateInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = createTransactionSchema.parse(input);

		// Verify the account belongs to this user
		const account = await db.query.milhasAccounts.findFirst({
			columns: { id: true },
			where: and(
				eq(milhasAccounts.id, data.accountId),
				eq(milhasAccounts.userId, user.id),
			),
		});

		if (!account) {
			return { success: false, error: "Conta não encontrada." };
		}

		const occurredAt = new Date(data.occurredAt);
		const expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;

		await db.transaction(async (tx) => {
			const dbTx = tx as unknown as typeof db;

			const [inserted] = await tx
				.insert(milhasTransactions)
				.values({
					accountId: data.accountId,
					userId: user.id,
					type: data.type,
					amount: data.amount,
					occurredAt,
					expiresAt,
					description: data.description ?? null,
					costBrl: data.costBrl,
					cashEquivalentBrl: data.cashEquivalentBrl,
				})
				.returning({ id: milhasTransactions.id });

			if (CREDIT_TYPES.has(data.type as MilhasTransactionType)) {
				await createLotForTransaction(dbTx, {
					userId: user.id,
					accountId: data.accountId,
					transactionId: inserted.id,
					amount: data.amount,
					occurredAt,
					expiresAt,
					costBrl: data.costBrl ?? null,
				});
			} else if (DEBIT_TYPES.has(data.type as MilhasTransactionType)) {
				await consumeLotsForTransaction(dbTx, {
					userId: user.id,
					accountId: data.accountId,
					transactionId: inserted.id,
					amount: data.amount,
				});
			}
		});

		revalidateForEntity("milhas");
		return { success: true, message: "Transação registrada com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}

export async function updateMilhasTransactionAction(
	input: TransactionUpdateInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = updateTransactionSchema.parse(input);

		// Block editing types with FIFO side-effects — delete and re-create instead.
		if (
			data.type === "REDEEM" ||
			data.type === "TRANSFER" ||
			data.type === "TRANSFER_OUT" ||
			data.type === "TRANSFER_IN"
		) {
			return {
				success: false,
				error: "Transações do tipo Resgate e Transferência não podem ser editadas. Remova e recrie para corrigir.",
			};
		}

		const [updated] = await db
			.update(milhasTransactions)
			.set({
				type: data.type,
				amount: data.amount,
				occurredAt: new Date(data.occurredAt),
				expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
				description: data.description ?? null,
				costBrl: data.costBrl,
				cashEquivalentBrl: data.cashEquivalentBrl,
			})
			.where(
				and(
					eq(milhasTransactions.id, data.id),
					eq(milhasTransactions.userId, user.id),
				),
			)
			.returning({ id: milhasTransactions.id });

		if (!updated) {
			return { success: false, error: "Transação não encontrada." };
		}

		revalidateForEntity("milhas");
		return { success: true, message: "Transação atualizada com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}

export async function deleteMilhasTransactionAction(
	input: TransactionDeleteInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = deleteTransactionSchema.parse(input);

		// Fetch the transaction to determine its type + transferId for FIFO cleanup
		const existingTx = await db.query.milhasTransactions.findFirst({
			columns: { id: true, type: true, accountId: true, transferId: true },
			where: and(
				eq(milhasTransactions.id, data.id),
				eq(milhasTransactions.userId, user.id),
			),
		});

		if (!existingTx) {
			return { success: false, error: "Transação não encontrada." };
		}

		const type = existingTx.type as MilhasTransactionType;

		// For TRANSFER_OUT: also delete the paired TRANSFER_IN (if unused)
		if (type === "TRANSFER_OUT") {
			if (existingTx.transferId) {
				const paired = await db.query.milhasTransactions.findFirst({
					columns: { id: true, accountId: true },
					where: and(
						eq(milhasTransactions.transferId, existingTx.transferId),
						eq(milhasTransactions.userId, user.id),
						eq(milhasTransactions.type, "TRANSFER_IN"),
					),
				});
				if (paired) {
					const { canDelete, consumedAmount } = await lotDeletionCheck(db, {
						userId: user.id,
						transactionId: paired.id,
					});
					if (!canDelete) {
						return {
							success: false,
							error: `Não é possível remover esta transferência: ${consumedAmount.toLocaleString("pt-BR")} milhas já foram utilizadas na conta de destino.`,
						};
					}
					await db.transaction(async (dbTx) => {
						const dbClient = dbTx as unknown as typeof db;
						await releaseLotAllocations(dbClient, {
							userId: user.id,
							transactionId: data.id,
						});
						await dbTx.delete(milhasTransactions).where(
							and(
								eq(milhasTransactions.id, paired.id),
								eq(milhasTransactions.userId, user.id),
							),
						);
						await dbTx.delete(milhasTransactions).where(
							and(
								eq(milhasTransactions.id, data.id),
								eq(milhasTransactions.userId, user.id),
							),
						);
					});
					revalidateForEntity("milhas");
					return { success: true, message: "Transferência removida com sucesso." };
				}
			}
		}

		// For TRANSFER_IN: check its lot, then also delete paired TRANSFER_OUT
		if (type === "TRANSFER_IN") {
			const { canDelete, consumedAmount } = await lotDeletionCheck(db, {
				userId: user.id,
				transactionId: data.id,
			});
			if (!canDelete) {
				return {
					success: false,
					error: `Não é possível remover esta transferência: ${consumedAmount.toLocaleString("pt-BR")} milhas já foram utilizadas nesta conta.`,
				};
			}
			if (existingTx.transferId) {
				const paired = await db.query.milhasTransactions.findFirst({
					columns: { id: true, accountId: true },
					where: and(
						eq(milhasTransactions.transferId, existingTx.transferId),
						eq(milhasTransactions.userId, user.id),
						eq(milhasTransactions.type, "TRANSFER_OUT"),
					),
				});
				if (paired) {
					await db.transaction(async (dbTx) => {
						const dbClient = dbTx as unknown as typeof db;
						await releaseLotAllocations(dbClient, {
							userId: user.id,
							transactionId: paired.id,
						});
						await dbTx.delete(milhasTransactions).where(
							and(
								eq(milhasTransactions.id, paired.id),
								eq(milhasTransactions.userId, user.id),
							),
						);
						await dbTx.delete(milhasTransactions).where(
							and(
								eq(milhasTransactions.id, data.id),
								eq(milhasTransactions.userId, user.id),
							),
						);
					});
					revalidateForEntity("milhas");
					return { success: true, message: "Transferência removida com sucesso." };
				}
			}
		}

		// Standard single-transaction deletion (EARN, ADJUST, REDEEM, EXPIRE, TRANSFER legacy)
		if (CREDIT_TYPES.has(type)) {
			const { canDelete, consumedAmount } = await lotDeletionCheck(db, {
				userId: user.id,
				transactionId: data.id,
			});
			if (!canDelete) {
				return {
					success: false,
					error: `Não é possível remover esta transação: ${consumedAmount.toLocaleString("pt-BR")} milhas deste lote já foram alocadas em resgates ou transferências.`,
				};
			}
		}

		await db.transaction(async (dbTx) => {
			const dbClient = dbTx as unknown as typeof db;

			if (DEBIT_TYPES.has(type)) {
				await releaseLotAllocations(dbClient, {
					userId: user.id,
					transactionId: data.id,
				});
			}

			await dbTx
				.delete(milhasTransactions)
				.where(
					and(
						eq(milhasTransactions.id, data.id),
						eq(milhasTransactions.userId, user.id),
					),
				);
		});

		revalidateForEntity("milhas");
		return { success: true, message: "Transação removida com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}

// ─── Transfers ─────────────────────────────────────────────────────────────────

const transferSchema = z.object({
	sourceAccountId: uuidSchema("Conta de origem"),
	destinationAccountId: uuidSchema("Conta de destino"),
	amount: z
		.number({ message: "Informe a quantidade de milhas." })
		.int("A quantidade deve ser um número inteiro.")
		.positive("A quantidade deve ser maior que zero."),
	bonusPercent: z
		.number()
		.min(0, "O bônus não pode ser negativo.")
		.max(10000, "Bônus inválido.")
		.default(0),
	occurredAt: z.string({ message: "Informe a data." }).date("Data inválida."),
	description: z
		.string()
		.trim()
		.max(255, "A descrição deve ter no máximo 255 caracteres.")
		.nullable()
		.optional()
		.transform((v) => (v && v.length > 0 ? v : null)),
});

type TransferInput = z.input<typeof transferSchema>;

/**
 * Creates a paired TRANSFER_OUT (source) + TRANSFER_IN (destination) atomically.
 * Consumes source miles via FIFO and creates a new lot in the destination account.
 * Destination miles = amount * (1 + bonusPercent / 100), rounded to nearest integer.
 */
export async function transferMilhasAction(
	input: TransferInput,
): Promise<ActionResult> {
	try {
		const user = await getUser();
		const data = transferSchema.parse(input);

		if (data.sourceAccountId === data.destinationAccountId) {
			return {
				success: false,
				error: "Conta de origem e destino devem ser diferentes.",
			};
		}

		const [sourceAccount, destAccount] = await Promise.all([
			db.query.milhasAccounts.findFirst({
				columns: { id: true },
				where: and(
					eq(milhasAccounts.id, data.sourceAccountId),
					eq(milhasAccounts.userId, user.id),
				),
			}),
			db.query.milhasAccounts.findFirst({
				columns: { id: true },
				where: and(
					eq(milhasAccounts.id, data.destinationAccountId),
					eq(milhasAccounts.userId, user.id),
				),
			}),
		]);

		if (!sourceAccount) {
			return { success: false, error: "Conta de origem não encontrada." };
		}
		if (!destAccount) {
			return { success: false, error: "Conta de destino não encontrada." };
		}

		const destinationAmount = Math.round(
			data.amount * (1 + data.bonusPercent / 100),
		);
		const transferId = randomUUID();
		const occurredAt = new Date(data.occurredAt);

		await db.transaction(async (tx) => {
			const dbTx = tx as unknown as typeof db;

			const [outTx] = await tx
				.insert(milhasTransactions)
				.values({
					accountId: data.sourceAccountId,
					userId: user.id,
					type: "TRANSFER_OUT",
					amount: data.amount,
					occurredAt,
					description: data.description ?? null,
					transferId,
				})
				.returning({ id: milhasTransactions.id });

			await consumeLotsForTransaction(dbTx, {
				userId: user.id,
				accountId: data.sourceAccountId,
				transactionId: outTx.id,
				amount: data.amount,
			});

			const [inTx] = await tx
				.insert(milhasTransactions)
				.values({
					accountId: data.destinationAccountId,
					userId: user.id,
					type: "TRANSFER_IN",
					amount: destinationAmount,
					occurredAt,
					description: data.description ?? null,
					transferId,
				})
				.returning({ id: milhasTransactions.id });

			await createLotForTransaction(dbTx, {
				userId: user.id,
				accountId: data.destinationAccountId,
				transactionId: inTx.id,
				amount: destinationAmount,
				occurredAt,
				expiresAt: null,
				costBrl: null,
			});
		});

		revalidateForEntity("milhas");
		return {
			success: true,
			message: `Transferência concluída: ${destinationAmount.toLocaleString("pt-BR")} milhas creditadas na conta de destino.`,
		};
	} catch (error) {
		return handleActionError(error);
	}
}
