import type { PrismaClient } from "@prisma/client";

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

// Busca un slug libre añadiendo sufijo -2, -3, ... si el base ya está cogido.
// Pasamos el cliente Prisma desde el caller para no acoplar a una instancia global.
export async function ensureUniqueCompanySlug(
  prisma: PrismaClient,
  base: string,
  excludeUserId?: string,
): Promise<string> {
  const root = slugify(base) || "empresa";
  let candidate = root;
  let i = 2;
  while (true) {
    const existing = await prisma.companyProfile.findUnique({
      where: { slug: candidate },
      select: { userId: true },
    });
    if (!existing || existing.userId === excludeUserId) return candidate;
    candidate = `${root}-${i++}`;
    if (i > 999) throw new Error(`No pude generar slug único para "${base}"`);
  }
}
