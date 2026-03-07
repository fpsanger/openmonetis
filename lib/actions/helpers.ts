import { revalidatePath, revalidateTag } from "next/cache";
import { z } from "zod";
import { errorResult } from "./types";
import type { ActionResult } from "./types";

// Re-export so action files can import ActionResult from a single place
export type { ActionResult };

/**
 * Handles errors in server actions consistently.
 * Generic so it is assignable to any ActionResult<T> return type.
 * @param error - The error to handle
 * @returns ActionResult with error message
 */
export function handleActionError<T = void>(error: unknown): ActionResult<T> {
	if (error instanceof z.ZodError) {
		return {
			success: false,
			error: error.issues[0]?.message ?? "Dados inválidos.",
		};
	}

	console.error("[ActionError]", error);
	return { success: false, error: "Ocorreu um erro inesperado. Tente novamente." };
}

/**
 * Configuration for revalidation after mutations
 */
export const revalidateConfig = {
	cartoes: ["/cartoes", "/contas", "/lancamentos"],
	contas: ["/contas", "/lancamentos"],
	categorias: ["/categorias"],
	estabelecimentos: ["/estabelecimentos", "/lancamentos"],
	orcamentos: ["/orcamentos"],
	pagadores: ["/pagadores"],
	anotacoes: ["/anotacoes", "/anotacoes/arquivadas", "/dashboard"],
	lancamentos: ["/lancamentos", "/contas"],
	inbox: ["/pre-lancamentos", "/lancamentos", "/dashboard"],
	milhas: ["/milhas"],
} as const;

/** Entities whose mutations should invalidate the dashboard cache */
const DASHBOARD_ENTITIES: ReadonlySet<string> = new Set([
	"lancamentos",
	"contas",
	"cartoes",
	"orcamentos",
	"pagadores",
	"anotacoes",
	"inbox",
]);

/**
 * Revalidates paths for a specific entity.
 * Also invalidates the dashboard "use cache" tag for financial entities.
 * @param entity - The entity type
 */
export function revalidateForEntity(
	entity: keyof typeof revalidateConfig,
): void {
	if (entity === "milhas") {
		// Invalidate the entire milhas subtree so account detail pages
		// (/milhas/accounts/[id]) also get fresh data after mutations.
		revalidatePath("/milhas", "layout");
	} else {
		revalidateConfig[entity].forEach((path) => revalidatePath(path));
	}

	// Invalidate dashboard cache for financial mutations
	if (DASHBOARD_ENTITIES.has(entity)) {
		revalidateTag("dashboard", "max");
	}
}
