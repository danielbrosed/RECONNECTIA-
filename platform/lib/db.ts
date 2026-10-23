import { PrismaClient } from "@prisma/client";
import { conTextoSinNulos } from "@/lib/db-sin-nulos";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Regresión LOTE 03: las escrituras quitan el carácter nulo de los textos
// (Postgres no lo guarda y el guardado entero fallaba): lib/db-sin-nulos.ts.
export const prisma =
  globalForPrisma.prisma ??
  conTextoSinNulos(
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
    }),
  );

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
