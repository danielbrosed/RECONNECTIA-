// Respuesta de una función V1 llamada en V0 (G11). Desde G13 la lista de
// funciones V1 y la guarda de servidor están en lib/soft-launch.ts
// (FUNCIONES_V1, funcionV1Abierta y negarFuncionV1): una acción V1 la llama al
// principio y devuelve esto. Reabrir una función = quitarla de esa lista.

export const MSG_PROXIMAMENTE = "Disponible próximamente.";

/** Resultado de una acción V1 llamada en V0. */
export function respuestaV1(): { ok: false; error: string } {
  return { ok: false, error: MSG_PROXIMAMENTE };
}
