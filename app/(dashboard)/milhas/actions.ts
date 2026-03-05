"use server";

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
import { MILHAS_TRANSACTION_TYPES } from "@/lib/milhas/constants";
import { uuidSchema } from "@/lib/schemas/common";

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

const createTransactionSchema = z.object({
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
});

const deleteTransactionSchema = z.object({ id: uuidSchema("Transação") });

type TransactionCreateInput = z.infer<typeof createTransactionSchema>;
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

		await db.insert(milhasTransactions).values({
			accountId: data.accountId,
			userId: user.id,
			type: data.type,
			amount: data.amount,
			occurredAt: new Date(data.occurredAt),
			expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
			description: data.description ?? null,
		});

		revalidateForEntity("milhas");
		return { success: true, message: "Transação registrada com sucesso." };
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

		const [deleted] = await db
			.delete(milhasTransactions)
			.where(
				and(
					eq(milhasTransactions.id, data.id),
					eq(milhasTransactions.userId, user.id),
				),
			)
			.returning({ id: milhasTransactions.id });

		if (!deleted) {
			return { success: false, error: "Transação não encontrada." };
		}

		revalidateForEntity("milhas");
		return { success: true, message: "Transação removida com sucesso." };
	} catch (error) {
		return handleActionError(error);
	}
}
