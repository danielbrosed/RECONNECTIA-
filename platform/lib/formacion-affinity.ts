// Afinidad formador↔formación (y alumno↔curso demo): sector + modalidad +
// distancia. Sustituye al cruce de especialidades como puntuación del deck.
// OJO: lib/matching.ts (afinidad alumno↔oferta de empleo) NO se toca; esta
// función es exclusiva del mundo formativo.
//
// Fórmula: score = sectorScore × distanceFactor
// - sectorScore: 100 si perfil y formación comparten algún SERVICIO, 50 neutral
//   si falta el dato en cualquiera de los dos lados, 0 si no coinciden.
//   Desde la ronda 6 los dos lados son LISTA: antes el perfil traía varios
//   sectores y la formación uno solo. Ver lib/servicios.ts.
// - distanceFactor según modalidad:
//   ONLINE    → 1 (la distancia no importa)
//   IN_PERSON → e^(-km / 430)
//   HYBRID    → 0.5 + 0.5 · e^(-km / 430) (parte del trabajo es remoto)
//   Si alguna provincia no se puede resolver → 1 y distanceKm = null (no se
//   penalizan los datos incompletos).
//
// Curva de referencia de e^(-km/430), calibrada con el ejemplo del cliente
// (online de tu sector = 100%; presencial en Bilbao viviendo en Sevilla,
// unos 700 km, ≈ 20%):
//   0 km = 100% · 100 km = 79% · 300 km = 50% · 500 km = 31% ·
//   700 km = 20% · 1000 km = 10%

import { PROVINCE_COORDS, haversineKm, resolveProvince } from "@/lib/geo";
import { servicioScoreFor } from "@/lib/servicios";

const HALF_LIFE_KM = 430;

/** A partir de esta distancia, un LIKE presencial pide confirmación con aviso. */
export const KM_WARN_THRESHOLD = 100;

export type FormacionAffinity = {
  score: number; // 0-100, lo que se muestra como afinidad
  sectorScore: number; // 0 | 50 | 100 (pre-distancia; el umbral del deck filtra por esto)
  distanceKm: number | null; // null si online o si no se pudo resolver provincia
  distanceFactor: number; // 0..1
};

/**
 * Puntuación de servicio. Se delega en lib/servicios para no tener dos
 * implementaciones de la misma regla.
 */
export function sectorScoreFor(
  profileServicios: readonly string[],
  targetServicios: readonly string[],
): number {
  return servicioScoreFor(profileServicios, targetServicios);
}

/** Km entre dos ubicaciones en texto libre, vía provincia. Null si no se resuelven. */
export function distanceKmBetween(
  placeA: string | null | undefined,
  placeB: string | null | undefined,
): number | null {
  const pa = resolveProvince(placeA);
  const pb = resolveProvince(placeB);
  if (!pa || !pb) return null;
  const a = PROVINCE_COORDS[pa];
  const b = PROVINCE_COORDS[pb];
  if (!a || !b) return null;
  return Math.round(haversineKm(a, b));
}

export function formacionAffinity(input: {
  profileServicios: readonly string[]; // servicios del perfil
  profilePlace: string | null | undefined; // provincia o ciudad del perfil
  servicios: readonly string[]; // servicios de la formación/curso
  modality: string; // ONLINE | IN_PERSON | HYBRID
  place: string | null | undefined; // ciudad/ubicación de la formación/curso
}): FormacionAffinity {
  const sectorScore = sectorScoreFor(input.profileServicios, input.servicios);

  if (input.modality === "ONLINE") {
    return { score: sectorScore, sectorScore, distanceKm: null, distanceFactor: 1 };
  }

  const distanceKm = distanceKmBetween(input.profilePlace, input.place);
  let distanceFactor = 1;
  if (distanceKm != null) {
    const f = Math.exp(-distanceKm / HALF_LIFE_KM);
    distanceFactor = input.modality === "HYBRID" ? 0.5 + 0.5 * f : f;
  }

  return {
    score: Math.round(sectorScore * distanceFactor),
    sectorScore,
    distanceKm,
    distanceFactor,
  };
}
