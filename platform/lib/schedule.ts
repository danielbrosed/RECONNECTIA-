// Helpers puros de fechas/horarios para proponer fechas de una impartición.
// Port fiel de la app CESEA (swipe.jsx: validateScheduleSequence/addHours/
// diffHours/formatHours/buildDatesString; calendar.jsx: detectScheduleClash).
// Funciones puras, SIN acceso a DB ni a tenant → usables en cliente y servidor.

export type Session = { day: string; from: string; to: string };
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
