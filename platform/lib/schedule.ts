// Helpers puros de fechas/horarios para proponer fechas de una impartición.
// Port fiel de la app CESEA (swipe.jsx: validateScheduleSequence/addHours/
// diffHours/formatHours/buildDatesString; calendar.jsx: detectScheduleClash).
// Funciones puras, SIN acceso a DB ni a tenant → usables en cliente y servidor.

import { excesoHoras, mensajeExcesoHoras } from "@/lib/sesiones-horas";

/**
 * LOTE08 (L8-02): en Mixta cada sesión es presencial u online. En las demás
 * modalidades la sesión no lleva modo (lib/modalidades.ts, normalizarModoSesiones),
 * y una sesión sin modo se pinta exactamente igual que antes.
 */
export const MODOS_SESION = ["PRESENCIAL", "ONLINE"] as const;
export type ModoSesion = (typeof MODOS_SESION)[number];
export const MODO_SESION_LABELS: Record<ModoSesion, string> = {
  PRESENCIAL: "Presencial",
  ONLINE: "Online",
};

/** ¿Es uno de los modos de sesión? */
export function esModoSesion(v: unknown): v is ModoSesion {
  return typeof v === "string" && (MODOS_SESION as readonly string[]).includes(v);
}

export type Session = { day: string; from: string; to: string; modo?: ModoSesion };
export type ScheduleCheck = { ok: boolean; error: string };

export const MESES_ES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

// Días de la semana lunes-primero (para la rejilla del calendario).
export const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

const MES_INDEX: Record<string, number> = {
  enero: 0, febrero: 1, marzo: 2, abril: 3, mayo: 4, junio: 5,
  julio: 6, agosto: 7, septiembre: 8, octubre: 9, noviembre: 10, diciembre: 11,
};

// Valida que el inicio sea ≤ fin y que cada sesión caiga dentro del rango y en
// orden ascendente. Bloquea el envío de la propuesta si no cuadra (swipe.jsx:8-21).
export function validateScheduleSequence(
  startDate: string,
  endDate: string,
  sessions: Session[],
): ScheduleCheck {
  if (!startDate) return { ok: false, error: "Indica una fecha de inicio." };
  if (!endDate) return { ok: false, error: "Indica una fecha de fin." };
  if (endDate < startDate) {
    return { ok: false, error: "La fecha de fin no puede ser anterior a la de inicio." };
  }
  for (let i = 0; i < (sessions || []).length; i++) {
    const s = sessions[i];
    if (s.day && s.day < startDate) {
      return { ok: false, error: `La sesión ${i + 1} es anterior a la fecha de inicio.` };
    }
    if (s.day && s.day > endDate) {
      return { ok: false, error: `La sesión ${i + 1} es posterior a la fecha de fin.` };
    }
    if (i > 0 && s.day && sessions[i - 1].day && s.day < sessions[i - 1].day) {
      return { ok: false, error: `La sesión ${i + 1} no puede ser anterior a la sesión ${i}.` };
    }
  }
  return { ok: true, error: "" };
}

// ── Coherencia de las sesiones (editor compartido y servidor) ──────────────
// Una sesión cuyo fin no es posterior a su inicio, o dos sesiones del mismo día
// que se pisan, no se pueden impartir. Lo comprueba el editor para avisar en
// pantalla y validarRound (lib/formaciones-fechas.ts) para rechazarlo en el
// servidor, con los mismos textos.

/** "YYYY-MM-DD" → "DD/MM/YYYY" para los mensajes. */
function diaLegible(iso: string): string {
  return iso.split("-").reverse().join("/");
}

/** Primer par de sesiones (índices en el orden recibido) que se solapan el mismo día. */
export function primerSolape(sessions: Session[]): [number, number] | null {
  for (let i = 0; i < sessions.length; i++) {
    const a = sessions[i];
    if (!a.day || !a.from || !a.to || a.to <= a.from) continue;
    for (let j = i + 1; j < sessions.length; j++) {
      const b = sessions[j];
      if (b.day !== a.day || !b.from || !b.to || b.to <= b.from) continue;
      // Tocarse (una acaba a las 13:00 y la otra empieza a las 13:00) no es solaparse.
      if (a.from < b.to && b.from < a.to) return [i, j];
    }
  }
  return null;
}

/**
 * LOTE09 (n4): la primera sesión (índice) que va antes que la anterior por día y,
 * el mismo día, por hora de inicio; null si van en orden. Sin día, no cuenta; sin
 * hora en alguna de las dos, solo el día.
 */
export function primeraFueraDeOrden(sessions: Session[]): number | null {
  for (let i = 1; i < sessions.length; i++) {
    const a = sessions[i - 1];
    const b = sessions[i];
    if (!a.day || !b.day) continue;
    if (b.day < a.day) return i;
    if (b.day === a.day && a.from && b.from && b.from < a.from) return i;
  }
  return null;
}

/** LOTE09 (n4): el aviso de la sesión fuera de orden (el de validateScheduleSequence). */
export function textoFueraDeOrden(i: number): string {
  return `La sesión ${i + 1} no puede ser anterior a la sesión ${i}.`;
}

/**
 * Mensajes que enseña el editor de sesiones. Vacío si todo cuadra.
 * LOTE07 (L7-07): con `horasMax` (las horas del curso), también si las sesiones
 * suman más (el mismo texto que dan las acciones del servidor).
 * LOTE09 (n4, Daniel: b): avisa de las sesiones fuera de orden por día y hora y
 * no deja guardar; el servidor ya no las ordena. El aviso va el último, así el
 * primero que usa validarRound para el solape no cambia.
 */
export function problemasSesiones(sessions: Session[], opciones: { horasMax?: number | null } = {}): string[] {
  const out: string[] = [];
  sessions.forEach((s, i) => {
    if (s.from && s.to && s.to <= s.from) {
      out.push(`Sesión ${i + 1}: la hora de fin tiene que ser posterior a la de inicio.`);
    }
  });
  const solape = primerSolape(sessions);
  if (solape) {
    const [i, j] = solape;
    out.push(`Las sesiones ${i + 1} y ${j + 1} se solapan el ${diaLegible(sessions[i].day)}. Cambia la hora o el día de una de ellas.`);
  }
  const exceso = excesoHoras(sessions, opciones.horasMax);
  if (exceso) out.push(mensajeExcesoHoras(exceso));
  const fuera = primeraFueraDeOrden(sessions);
  if (fuera !== null) out.push(textoFueraDeOrden(fuera));
  return out;
}

/** Día siguiente a "YYYY-MM-DD" (para proponer la sesión nueva sin pisar la anterior). */
export function diaSiguiente(iso: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return "";
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

// "HH:MM" + horas → "HH:MM". El sistema sugiere la hora_fin a partir de las
// horas/día del curso; el formador puede editarla (swipe.jsx:27-34).
export function addHours(time: string, hours: number): string {
  if (!time || !hours) return time || "";
  const [h, m] = time.split(":").map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
}

// Horas decimales entre dos "HH:MM" (swipe.jsx:35-40).
export function diffHours(from: string, to: string): number {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  return (th * 60 + tm - (fh * 60 + fm)) / 60;
}

// Horas decimales → "3h 30min" legible (swipe.jsx:41-48).
export function formatHours(h: number): string {
  if (!h || h <= 0) return "0h";
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  if (mins === 0) return `${whole}h`;
  if (whole === 0) return `${mins}min`;
  return `${whole}h ${mins}min`;
}

// Sesiones → "D1, D2, D3 Mes Año" (swipe.jsx:103-112). Asume mismo mes/año.
export function buildDatesString(sessions: Session[]): string {
  const days = (sessions || []).map((s) => s.day).filter(Boolean);
  if (days.length === 0) return "";
  const parsed = days.map((d) => new Date(d));
  const monthIdx = parsed[0].getMonth();
  const year = parsed[0].getFullYear();
  const dayNums = parsed.map((d) => d.getDate()).join(", ");
  return `${dayNums} ${MESES_ES[monthIdx]} ${year}`;
}

export type DayHalf = { morning: boolean; afternoon: boolean };

// Mañana/tarde de un horario "HH:MM-HH:MM" con umbral fijo 14:00 (calendar.jsx:24-41).
// Sin horario → mañana. Un tramo que cruza las 14:00 cae en ambas mitades.
export function getDayHalf(timeRange: string | null | undefined): DayHalf {
  if (!timeRange) return { morning: true, afternoon: false };
  // El time_str real usa guion normal o largo ("09:00-14:00" / "09:00–14:00").
  const parts = String(timeRange).replace(/\s/g, "").split(/[-–—]/);
  const toDec = (t: string): number | null => {
    if (!t) return null;
    const [h, mm = "00"] = t.split(":");
    const hv = parseInt(h, 10);
    if (Number.isNaN(hv)) return null;
    return hv + (parseInt(mm, 10) || 0) / 60;
  };
  const start = toDec(parts[0]);
  const end = parts[1] != null ? toDec(parts[1]) : start;
  if (start == null) return { morning: true, afternoon: false };
  return { morning: start < 14, afternoon: (end ?? start) > 14 };
}

// Parsea "13-16 Abril 2026" / "1, 8, 15 Febrero 2026" / "5 Marzo 2026" y devuelve
// los días-del-mes (1..31) SI Y SOLO SI el mes/año del texto coincide con
// (year, month) — month es índice 0..11 (calendar.jsx:48-72).
export function parseCourseDays(
  datesStr: string | null | undefined,
  year: number,
  month: number,
): number[] {
  if (!datesStr) return [];
  const mRe = String(datesStr).match(
    /(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+(\d{4})/i,
  );
  if (!mRe) return [];
  const monthIdx = MES_INDEX[mRe[1].toLowerCase()];
  const y = parseInt(mRe[2], 10);
  if (monthIdx !== month || y !== year) return [];
  const raw = datesStr.slice(0, mRe.index).trim();
  const days: number[] = [];
  const range = raw.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
  if (range) {
    const s = parseInt(range[1], 10);
    const e = parseInt(range[2], 10);
    for (let d = s; d <= e; d++) days.push(d);
  } else {
    raw.split(/[,;]/).forEach((n) => {
      const v = parseInt(n.trim(), 10);
      if (!Number.isNaN(v)) days.push(v);
    });
  }
  return days;
}

export type ClashCourse = {
  title: string;
  dates: string | null;
  time: string | null;
  status?: string | null;
};

// Detección de duplicidad horaria (calendar.jsx:329-374): mismaFecha AND
// inicioA < finB AND finA > inicioB, contra formaciones aceptadas/en revisión.
// Devuelve los títulos en conflicto (aviso NO bloqueante).
export function detectScheduleClash(dates: string, time: string, courses: ClashCourse[]): string[] {
  if (!dates || !time) return [];

  const parseTime = (t: string | null): number | null => {
    if (!t) return null;
    const [h, mm = "00"] = String(t).split(":");
    const hv = parseInt(h, 10);
    if (Number.isNaN(hv)) return null;
    return hv + (parseInt(mm, 10) || 0) / 60;
  };

  const [startH, endH] = String(time).replace(/\s/g, "").split(/[-–—]/).map(parseTime);
  if (startH == null || endH == null) return [];

  const expandDays = (datesStr: string | null): string[] => {
    if (!datesStr) return [];
    const mRe = String(datesStr).match(
      /(Enero|Febrero|Marzo|Abril|Mayo|Junio|Julio|Agosto|Septiembre|Octubre|Noviembre|Diciembre)\s+(\d{4})/i,
    );
    if (!mRe) return [];
    const idx = MES_INDEX[mRe[1].toLowerCase()];
    const y = parseInt(mRe[2], 10);
    const raw = datesStr.slice(0, mRe.index).trim();
    const days: string[] = [];
    const range = raw.match(/^(\d{1,2})\s*-\s*(\d{1,2})$/);
    if (range) {
      const s = parseInt(range[1], 10);
      const e = parseInt(range[2], 10);
      for (let d = s; d <= e; d++) {
        days.push(`${y}-${String(idx + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`);
      }
    } else {
      raw.split(/[,;]/).forEach((n) => {
        const v = parseInt(n.trim(), 10);
        if (!Number.isNaN(v)) {
          days.push(`${y}-${String(idx + 1).padStart(2, "0")}-${String(v).padStart(2, "0")}`);
        }
      });
    }
    return days;
  };

  const myDays = expandDays(dates);
  const clashes: string[] = [];
  for (const c of courses || []) {
    if (c.status && !["accepted", "review"].includes(c.status)) continue;
    const theirDays = expandDays(c.dates);
    const overlap = myDays.some((d) => theirDays.includes(d));
    if (!overlap) continue;
    const [s2, e2] = String(c.time || "").replace(/\s/g, "").split(/[-–—]/).map(parseTime);
    if (s2 == null || e2 == null) continue;
    if (startH < e2 && endH > s2) clashes.push(c.title);
  }
  return clashes;
}
