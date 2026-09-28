/**
 * Reconnect-iA · motor de afinidad MVP
 *
 * Solo cruza competencias exactas (case-insensitive). Sin embeddings ni
 * proximidad semántica — eso es Re-Connect en Fase 2 (Q4 2026).
 *
 * Salida: 0–100. Cuando la oferta no exige competencias, devuelve 50
 * (neutral) para no penalizar perfiles incompletos.
 */
export function affinityScore(
  candidateCompetencies: string[],
  jobRequiredCompetencies: string[],
): number {
  if (!jobRequiredCompetencies || jobRequiredCompetencies.length === 0) {
    return 50;
  }
  const set = new Set(
    candidateCompetencies.map((s) => s.trim().toLowerCase()).filter(Boolean),
  );
  const matches = jobRequiredCompetencies.filter((c) =>
    set.has(c.trim().toLowerCase()),
  ).length;
  return Math.round((matches / jobRequiredCompetencies.length) * 100);
}
