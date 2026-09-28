// Geografía de España para el cálculo de distancias de la afinidad formativa.
// Tabla estática (sin APIs externas): 50 provincias + Ceuta y Melilla, con las
// coordenadas de su capital. Funciones puras, usables en cliente y servidor.
//
// La distancia entre dos lugares se aproxima como la distancia entre las
// capitales de sus provincias. Es suficiente para ordenar y avisar de
// desplazamientos; no pretende ser un cálculo puerta a puerta.

export type ProvinceInfo = { lat: number; lng: number; capital: string };

// Nombre canónico de provincia → capital y coordenadas.
export const PROVINCE_COORDS: Record<string, ProvinceInfo> = {
  "Álava": { lat: 42.8467, lng: -2.6716, capital: "Vitoria-Gasteiz" },
  "Albacete": { lat: 38.9943, lng: -1.8585, capital: "Albacete" },
  "Alicante": { lat: 38.3452, lng: -0.481, capital: "Alicante" },
  "Almería": { lat: 36.834, lng: -2.4637, capital: "Almería" },
  "Asturias": { lat: 43.3619, lng: -5.8494, capital: "Oviedo" },
  "Ávila": { lat: 40.6566, lng: -4.6818, capital: "Ávila" },
  "Badajoz": { lat: 38.8794, lng: -6.9707, capital: "Badajoz" },
  "Barcelona": { lat: 41.3874, lng: 2.1686, capital: "Barcelona" },
  "Burgos": { lat: 42.344, lng: -3.6969, capital: "Burgos" },
  "Cáceres": { lat: 39.4753, lng: -6.3724, capital: "Cáceres" },
  "Cádiz": { lat: 36.5271, lng: -6.2886, capital: "Cádiz" },
  "Cantabria": { lat: 43.4623, lng: -3.81, capital: "Santander" },
  "Castellón": { lat: 39.9864, lng: -0.0513, capital: "Castellón de la Plana" },
  "Ciudad Real": { lat: 38.9861, lng: -3.9291, capital: "Ciudad Real" },
  "Córdoba": { lat: 37.8882, lng: -4.7794, capital: "Córdoba" },
  "A Coruña": { lat: 43.3623, lng: -8.4115, capital: "A Coruña" },
  "Cuenca": { lat: 40.0704, lng: -2.1374, capital: "Cuenca" },
  "Girona": { lat: 41.9794, lng: 2.8214, capital: "Girona" },
  "Granada": { lat: 37.1773, lng: -3.5986, capital: "Granada" },
  "Guadalajara": { lat: 40.6329, lng: -3.161, capital: "Guadalajara" },
  "Gipuzkoa": { lat: 43.3183, lng: -1.9812, capital: "Donostia-San Sebastián" },
  "Huelva": { lat: 37.2614, lng: -6.9447, capital: "Huelva" },
  "Huesca": { lat: 42.1401, lng: -0.4089, capital: "Huesca" },
  "Illes Balears": { lat: 39.5696, lng: 2.6502, capital: "Palma" },
  "Jaén": { lat: 37.7796, lng: -3.7849, capital: "Jaén" },
  "León": { lat: 42.5987, lng: -5.5671, capital: "León" },
  "Lleida": { lat: 41.6176, lng: 0.62, capital: "Lleida" },
  "Lugo": { lat: 43.0097, lng: -7.556, capital: "Lugo" },
  "Madrid": { lat: 40.4168, lng: -3.7038, capital: "Madrid" },
  "Málaga": { lat: 36.7213, lng: -4.4214, capital: "Málaga" },
  "Murcia": { lat: 37.9922, lng: -1.1307, capital: "Murcia" },
  "Navarra": { lat: 42.8125, lng: -1.6458, capital: "Pamplona" },
  "Ourense": { lat: 42.3358, lng: -7.8639, capital: "Ourense" },
  "Palencia": { lat: 42.0096, lng: -4.5288, capital: "Palencia" },
  "Las Palmas": { lat: 28.1235, lng: -15.4363, capital: "Las Palmas de Gran Canaria" },
  "Pontevedra": { lat: 42.431, lng: -8.6444, capital: "Pontevedra" },
  "La Rioja": { lat: 42.4627, lng: -2.4449, capital: "Logroño" },
  "Salamanca": { lat: 40.9701, lng: -5.6635, capital: "Salamanca" },
  "Santa Cruz de Tenerife": { lat: 28.4636, lng: -16.2518, capital: "Santa Cruz de Tenerife" },
  "Segovia": { lat: 40.9429, lng: -4.1088, capital: "Segovia" },
  "Sevilla": { lat: 37.3891, lng: -5.9845, capital: "Sevilla" },
  "Soria": { lat: 41.7636, lng: -2.4649, capital: "Soria" },
  "Tarragona": { lat: 41.1189, lng: 1.2445, capital: "Tarragona" },
  "Teruel": { lat: 40.3457, lng: -1.1065, capital: "Teruel" },
  "Toledo": { lat: 39.8628, lng: -4.0273, capital: "Toledo" },
  "Valencia": { lat: 39.4699, lng: -0.3763, capital: "Valencia" },
  "Valladolid": { lat: 41.6523, lng: -4.7245, capital: "Valladolid" },
  "Bizkaia": { lat: 43.263, lng: -2.935, capital: "Bilbao" },
  "Zamora": { lat: 41.5036, lng: -5.7448, capital: "Zamora" },
  "Zaragoza": { lat: 41.6488, lng: -0.8891, capital: "Zaragoza" },
  "Ceuta": { lat: 35.8894, lng: -5.3213, capital: "Ceuta" },
  "Melilla": { lat: 35.2923, lng: -2.9381, capital: "Melilla" },
};

/** Lista canónica para selects (orden alfabético español). */
export const PROVINCES = Object.keys(PROVINCE_COORDS).sort((a, b) =>
  a.localeCompare(b, "es"),
);

// Nombres alternativos habituales → provincia canónica. Se suman al nombre de
// la provincia y de su capital a la hora de resolver texto libre.
const EXTRA_ALIASES: Record<string, string> = {
  "vitoria": "Álava",
  "araba": "Álava",
  "oviedo": "Asturias",
  "gijon": "Asturias",
  "santander": "Cantabria",
  "castellon": "Castellón",
  "castello": "Castellón",
  "la coruna": "A Coruña",
  "coruna": "A Coruña",
  "gerona": "Girona",
  "guipuzcoa": "Gipuzkoa",
  "san sebastian": "Gipuzkoa",
  "donostia": "Gipuzkoa",
  "baleares": "Illes Balears",
  "islas baleares": "Illes Balears",
  "palma": "Illes Balears",
  "mallorca": "Illes Balears",
  "lerida": "Lleida",
  "pamplona": "Navarra",
  "iruna": "Navarra",
  "orense": "Ourense",
  "gran canaria": "Las Palmas",
  "logrono": "La Rioja",
  "tenerife": "Santa Cruz de Tenerife",
  "vizcaya": "Bizkaia",
  "bilbao": "Bizkaia",
};

function normalize(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // fuera diacriticos: "Logrono" con tilde pasa a "logrono"
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Alias normalizado → provincia. Se construye una sola vez.
const ALIAS_TO_PROVINCE: Array<{ alias: string; province: string }> = (() => {
  const seen = new Map<string, string>();
  for (const [province, info] of Object.entries(PROVINCE_COORDS)) {
    for (const alias of [province, info.capital]) {
      const n = normalize(alias);
      if (n && !seen.has(n)) seen.set(n, province);
    }
  }
  for (const [alias, province] of Object.entries(EXTRA_ALIASES)) {
    if (!seen.has(alias)) seen.set(alias, province);
  }
  // Los alias más largos primero: "santa cruz de tenerife" debe ganar a "tenerife".
  return [...seen.entries()]
    .map(([alias, province]) => ({ alias, province }))
    .sort((a, b) => b.alias.length - a.alias.length);
})();

/**
 * Resuelve un texto libre de ubicación ("Bilbao", "Sevilla, ES", "Vitoria-Gasteiz")
 * a su provincia canónica. Devuelve null si no se reconoce. El match exige
 * límites de palabra: "León" no debe activarse dentro de "Castellón".
 */
export function resolveProvince(text: string | null | undefined): string | null {
  if (!text) return null;
  const n = ` ${normalize(text)} `;
  if (n.trim().length === 0) return null;
  for (const { alias, province } of ALIAS_TO_PROVINCE) {
    if (n.includes(` ${alias} `)) return province;
  }
  return null;
}

/**
 * Parte una ubicación guardada como texto libre en provincia y municipio, para
 * poder precargar el selector de dos pasos (ProvinciaCiudad). Tolera los
 * formatos que ya hay en base de datos: "Bilbao, Bizkaia", "Bilbao, ES",
 * "Bilbao". El municipio es lo que va antes de la primera coma; si coincide con
 * la propia provincia se devuelve vacío para no repetirlo en el desplegable.
 */
export function splitLocation(text: string | null | undefined): {
  province: string;
  city: string;
} {
  const province = resolveProvince(text) ?? "";
  if (!text) return { province: "", city: "" };
  const city = text.split(",")[0]?.trim() ?? "";
  if (!city || normalize(city) === normalize(province)) return { province, city: "" };
  return { province, city };
}

/** Distancia Haversine en km entre dos coordenadas. */
export function haversineKm(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Distancia en km entre dos provincias canónicas (null si alguna no existe). */
export function distanceBetweenProvincesKm(p1: string, p2: string): number | null {
  const a = PROVINCE_COORDS[p1];
  const b = PROVINCE_COORDS[p2];
  if (!a || !b) return null;
  return Math.round(haversineKm(a, b));
}
