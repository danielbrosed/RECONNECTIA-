import type { PrismaClient } from "@prisma/client";
import { slugLibre } from "@/lib/perfil-slug";

const NON_ALNUM = /[^a-z0-9]+/g;
const EDGE_DASH = /^-+|-+$/g;
const DIACRITICS = /\p{Diacritic}/gu;

export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(DIACRITICS, "")
    .toLowerCase()
    .replace(NON_ALNUM, "-")
    .replace(EDGE_DASH, "")
    .slice(0, 60);
}

/**
 * Primera dirección libre para una empresa a partir de su nombre (registro,
 * alta y cambio de rol por administración, «Mi empresa» sin dirección).
 *
 * LOTE02 · revisión de la fase 1 (M12): antes solo miraba CompanyProfile.slug,
 * así que un alta nueva podía quedarse con la dirección ANTERIOR de otra
 * empresa (reservada para siempre en SlugAnterior, E8) y llevarse sus enlaces,
 * o con una palabra reservada («empresa», su raíz por defecto). Ahora es
 * slugLibre (lib/perfil-slug.ts): salta las actuales, las anteriores y las
 * reservadas, y no devuelve una anterior de la propia cuenta.
 * Pasamos el cliente Prisma desde el caller para no acoplar a una instancia global.
 */
export async function ensureUniqueCompanySlug(
  prisma: Pick<PrismaClient, "companyProfile" | "entityProfile" | "slugAnterior">,
  base: string,
  excludeUserId?: string,
): Promise<string> {
  return slugLibre(prisma, "EMPRESA", base, excludeUserId);
}
