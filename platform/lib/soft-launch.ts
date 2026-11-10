// Fuente ÚNICA del lanzamiento por fases (cliente + servidor). Fichero PURO: sin
// Next ni Prisma (lo importan proxy.ts, las páginas, las acciones y las pruebas).
//
// Tres piezas:
//   1. FUNCIONES_V1: lo que existe en el código pero NO es V0. Cada función con su
//      id, el motivo y, si tiene pantallas, sus rutas. Esas rutas quedan cerradas
//      para todos los roles, las pantallas no la pintan (funcionV1Abierta) y sus
//      acciones de servidor la niegan (negarFuncionV1) antes de leer o escribir.
//      Reabrir una función V1 = quitarla de esta lista.
//   2. RUTAS_V0: las pantallas abiertas de cada rol. Todo lo que no esté aquí se
//      tapa: proxy.ts redirige a /no-disponible antes de renderizar.
//   3. isActivePath(ruta, rol?): la regla que usan proxy.ts, lib/destino.ts y las
//      pruebas. Sin rol (proxy.ts no lee la sesión) vale la unión de los roles;
//      el rol lo cierra después cada sección con requireRole/requireAnyRole.
//
// Pon SOFT_LAUNCH=false para abrir toda la app de golpe (también las funciones
// V1); al abrir, recuerda restaurar la navegación completa en lib/nav.ts y las
// tarjetas/roles del registro.

import type { Role } from "@/lib/roles";
import { respuestaV1 } from "@/lib/v1";

export const SOFT_LAUNCH = true;

// ---------------------------------------------------------------------------
// 1. Funciones V1
// ---------------------------------------------------------------------------

const MOTIVO_APP_EXTERNA = "Conexión con una app externa: nada de eso va en V0 (regla del cliente).";
const MOTIVO_POSTULAR = "Postular a una oferta es V1: en V0 los alumnos aún no se postulan.";
const MOTIVO_TRANSFERENCIAS = "Las transferencias de SkillPoints entre cuentas son V1.";
const MOTIVO_CAMPUS = "El campus (LMS) y la matrícula en cursos no son V0.";
const MOTIVO_PLATAFORMAS = "Las plataformas propias de formación (marca blanca) son V1.";
// LOTE06: ACAT, EROP, ECHO y EVOP ya son V0 (se desbloquean con SkillPoints,
// lib/evaluaciones/desbloqueo-server.ts). ECOE sigue «Próximamente» y el flujo
// viejo de coberturas (EvalRequest) queda retirado.
const MOTIVO_EVALUACIONES = "ECOE es «Próximamente» y el flujo viejo de coberturas de evaluación (EvalRequest) está retirado.";

/**
 * Lista de funciones V1. `rutas` usa el formato de RUTAS_V0 (ver `casaPatron`).
 * El orden sigue el encargo de G13; las «ya tapadas» van al final con su id.
 */
export const FUNCIONES_V1 = [
  // ── Conexiones externas (LinkedIn) ────────────────────────────────────────
  {
    id: "transversal.linkedin.vincular",
    motivo: `${MOTIVO_APP_EXTERNA} /api/linkedin/start y /callback responden 404; desvincular queda negado.`,
  },
  { id: "alumno.perfil.vincular-linkedin", motivo: `${MOTIVO_APP_EXTERNA} Bloque LinkedIn de /perfil.` },
  { id: "formador.perfil.linkedin", motivo: `${MOTIVO_APP_EXTERNA} Bloque LinkedIn de /formador/perfil.` },
  {
    id: "alumno.externo.anadir-a-linkedin",
    motivo: `${MOTIVO_APP_EXTERNA} Enlace «Añadir a LinkedIn» de cada certificado.`,
  },

  // ── Candidaturas ──────────────────────────────────────────────────────────
  {
    id: "empresa.ofertas.candidatos",
    motivo: `${MOTIVO_POSTULAR} Lista de candidatos de una oferta.`,
    rutas: ["/empresa/ofertas/*/candidatos/**"],
  },
  { id: "empresa.ofertas.estado-candidatura", motivo: `${MOTIVO_POSTULAR} Cambiar el estado de una candidatura.` },
  {
    id: "transversal.correo.nueva-candidatura",
    motivo: `${MOTIVO_POSTULAR} El correo solo sale al postular, que está negado (alumno.ofertas.postular).`,
  },
  { id: "alumno.ofertas.postular", motivo: `${MOTIVO_POSTULAR} La acción vuelve a /ofertas sin hacer nada.` },

  // ── Puntos y transferencias ───────────────────────────────────────────────
  { id: "alumno.skp.aceptar-transferencia", motivo: `${MOTIVO_TRANSFERENCIAS} Aceptar o rechazar una recibida.` },
  {
    id: "alumno.skp.verificar-intercambio",
    motivo: "Los intercambios del banco del tiempo (TimePoints) son V1: completar, verificar o disputar.",
  },
  {
    id: "alumno.skp.comprar-simulado",
    motivo: "Comprar SkillPoints es V1 (además lo cierra COBRO_ABIERTO): en V0 se piden por correo a soporte (LOTE05, L5-16; antes por WhatsApp).",
  },
  { id: "empresa.skp.transferencias-enviadas", motivo: `${MOTIVO_TRANSFERENCIAS} Lista de enviadas de la empresa.` },
  { id: "empresa.skp.regalar-trabajador", motivo: `${MOTIVO_TRANSFERENCIAS} Regalar SkillPoints a un trabajador.` },
  { id: "empresa.skp.cancelar-transferencia", motivo: `${MOTIVO_TRANSFERENCIAS} Cancelar una enviada.` },
  // LOTE06: fuera «admin.skp.tarifas-evaluaciones» (las tarifas EVAL_* se cambian en /admin/skp).

  // ── Campus, evaluaciones y plataformas ────────────────────────────────────
  { id: "empresa.pyc.asignar-curso", motivo: `${MOTIVO_CAMPUS} Asignar un curso del campus a un trabajador.` },
  {
    id: "alumno.catalogo.aula-si-inscrito",
    motivo: `${MOTIVO_CAMPUS} «Mi formación de empresa», sesiones en directo y aula del catálogo; lecciones, tareas, test y formularios del alumno.`,
  },
  // LOTE02 (AL6): el alumno ve el catálogo en lista, solo con cursos de entidad.
  {
    id: "alumno.catalogo.escaparate",
    motivo: "LOTE02 (AL6): los destacados, las tarjetas con imagen y los bloques por proveedor del catálogo del alumno son V1 (el componente se conserva).",
  },
  {
    id: "alumno.catalogo.cursos-plataforma",
    motivo: "LOTE02 (AL6): los cursos de plataforma sin copia de entidad y los packs son V1 para el alumno. Sus fichas (/cursos/empresa/*, /cursos/pack/*) salen de las rutas V0 del alumno; el resto de roles las conserva.",
  },
  {
    id: "entidad.panel.cuadro-cesea",
    motivo: `${MOTIVO_PLATAFORMAS} El portal pinta siempre el panel normal de la entidad, también con plataforma activa.`,
  },
  { id: "admin.entidades.crear-plataforma", motivo: `${MOTIVO_PLATAFORMAS} «Nueva plataforma».` },
  {
    id: "admin.entidades.editar-configuracion",
    motivo: `${MOTIVO_PLATAFORMAS} Marca, modo de inserción y capacidades de una plataforma.`,
  },

  // ── Otras ─────────────────────────────────────────────────────────────────
  {
    id: "formador.perfil.visible-para-empresas",
    motivo: "Las empresas no ven a los formadores en V0. G06a quitó el interruptor: no queda código que lo use.",
  },
  {
    id: "entidad.imparticion.descartar-propuesta-antigua",
    motivo: "Las propuestas de fechas del circuito anterior solo las limpia administración; la entidad no lo ve.",
  },
  // LOTE05 (L5-04): pedir la validación del alta en una reunión (por WhatsApp).
  {
    id: "transversal.alta.reunion-validacion",
    motivo:
      "LOTE05 (L5-04): «Prefiero validar en una reunión» es V1. Ni el alta de la empresa ni la de la entidad lo enseñan y la acción que lo pide (accionPedirReunion de lib/altas/acciones-cuenta.ts) lo niega.",
  },

  // ── Ya tapadas antes de G13 (verificadas) ─────────────────────────────────
  // LOTE06: fuera «alumno.evaluaciones.acat-erop» y «empresa.evaluaciones.coberturas»
  // (sus pantallas son V0: RUTAS_V0). Lo viejo de las coberturas sigue negado con su
  // propia clave; el pago de una evaluación con tarjeta y la compra de SkillPoints
  // fallan siempre (payForEvaluationAction y purchaseSkpAction, lib/latentes-s1.test.ts).
  { id: "alumno.externo.ecoe", motivo: `${MOTIVO_EVALUACIONES} Resultados ECOE en «CV y formación previa».` },
  {
    id: "evaluaciones.coberturas-antiguas",
    motivo: `${MOTIVO_EVALUACIONES} Pedir, aprobar, rechazar o cancelar una cobertura vieja (lib/skp/actions.ts); las evaluaciones se desbloquean con DesbloqueoEvaluacion.`,
  },
  {
    id: "alumno.comunidad.banco-del-tiempo",
    motivo: "El banco del tiempo y la comunidad son V1.",
    rutas: ["/perfil/comunidad/**"],
  },
  { id: "alumno.campus.formacion", motivo: `${MOTIVO_CAMPUS} Campus CESEA del alumno.`, rutas: ["/formacion/**"] },
  {
    id: "formador.campus",
    motivo: `${MOTIVO_CAMPUS} Cursos, agenda y panel de formación del formador.`,
    rutas: ["/formador/cursos/**", "/formador/agenda/**", "/formador/panel/**"],
  },
  {
    id: "entidad.portal.espacio-cesea",
    motivo: `${MOTIVO_PLATAFORMAS} Espacio de datos de la plataforma CESEA dentro del portal y cartera de SkillPoints de la entidad con transferencias.`,
    rutas: [
      "/portal/cursos",
      "/portal/alumnos/**",
      "/portal/imparticiones/**",
      "/portal/horas/**",
      "/portal/expedientes/**",
      "/portal/empleo/**",
      "/portal/promociones/**",
      "/portal/configuracion/**",
      "/portal/solicitudes/**",
      "/portal/formacion/**",
      "/portal/formadores/**",
      "/portal/skp/**",
    ],
  },
  {
    id: "empresa.planes-facturacion",
    motivo: "Planes y facturación de la empresa son V1.",
    rutas: ["/empresa/planes/**", "/empresa/facturacion/**"],
  },
  { id: "empresa.campus", motivo: `${MOTIVO_CAMPUS} Campus de la empresa.`, rutas: ["/empresa/formacion/**"] },
  {
    id: "transversal.campus.cursos",
    motivo: `${MOTIVO_CAMPUS} Crear, editar e impartir cursos del campus (empresa, entidad y formador): acciones de lib/lms/actions.ts.`,
  },
  {
    id: "transversal.marketplace",
    motivo: `${MOTIVO_CAMPUS} Marketplace público de formación (la página vuelve a la portada).`,
    rutas: ["/marketplace/**"],
  },
  {
    id: "transversal.panel-embebido",
    motivo: `${MOTIVO_APP_EXTERNA} Panel embebido del proveedor (404).`,
    rutas: ["/proveedor/*/panel/**"],
  },
  {
    id: "transversal.sso-cesea",
    motivo: `${MOTIVO_APP_EXTERNA} Puente SSO con la plataforma CESEA (404).`,
    rutas: ["/api/proveedor/cesea/sso-token"],
  },
] as const satisfies readonly { id: string; motivo: string; rutas?: readonly string[] }[];

export type FuncionV1 = (typeof FUNCIONES_V1)[number];
export type IdFuncionV1 = FuncionV1["id"];

const CERRADAS: ReadonlySet<string> = new Set(FUNCIONES_V1.map((f) => f.id));

/** Rutas de todas las funciones V1: cerradas para todos los roles. */
export const RUTAS_V1: readonly string[] = FUNCIONES_V1.flatMap((f) =>
  "rutas" in f ? [...f.rutas] : [],
);

/** ¿Está abierta esta función V1? Hoy, ninguna: solo con SOFT_LAUNCH=false o quitándola de la lista. */
export function funcionV1Abierta(id: IdFuncionV1): boolean {
  return !SOFT_LAUNCH || !CERRADAS.has(id);
}

/**
 * Guarda de servidor de una acción V1. La acción la llama al principio, antes de
 * leer o escribir nada, y devuelve lo que reciba si no es null:
 *   const v1 = negarFuncionV1("…"); if (v1) return v1;
 * Mismo resultado que dejó G11: `{ ok: false, error: "Disponible próximamente." }`.
 */
export function negarFuncionV1(id: IdFuncionV1): { ok: false; error: string } | null {
  return funcionV1Abierta(id) ? null : respuestaV1();
}

// ---------------------------------------------------------------------------
// 2. Rutas V0 por rol
// ---------------------------------------------------------------------------
//
// Formato de cada patrón (se compara segmento a segmento, sin barra final):
//   "/a/b"     exactamente /a/b y nada por debajo.
//   "/a/*"     un identificador en esa posición (cuid o slug: letras, números,
//              _ y -, hasta 64; nunca una palabra reservada de ruta como
//              «nuevo», «importar» o «editar»). Sin puntos, así que tampoco
//              deja pasar ficheros.
//   "/a/**"    /a y cualquier cosa por debajo (solo al final).

const ID_SEGMENTO = /^[A-Za-z0-9_-]{1,64}$/;
const RESERVADAS = new Set(["nuevo", "nueva", "importar", "editar", "publicar", "solicitar"]);

function casaPatron(pathname: string, patron: string): boolean {
  const ruta = pathname.split("/").slice(1);
  const partes = patron.split("/").slice(1);
  for (let i = 0; i < partes.length; i++) {
    const p = partes[i];
    if (p === "**" && i === partes.length - 1) return true;
    const s = ruta[i];
    if (s === undefined) return false;
    if (p === "*") {
      if (!ID_SEGMENTO.test(s) || RESERVADAS.has(s)) return false;
    } else if (p !== s) {
      return false;
    }
  }
  return ruta.length === partes.length;
}

// Catálogo de formación en SOLO LECTURA, para cualquier rol con sesión: el
// listado, la ficha de cada curso de proveedor con su temario, los paquetes y
// programas Experto y (G07 H2) la ficha de un curso de ENTIDAD. La matrícula y
// el cobro no dependen de esta lista: los cierra lib/matricula.ts dentro de cada
// acción. Van uno a uno a propósito: un «/cursos/**» abriría cualquier ruta
// futura que cuelgue de ahí sin pasar por revisión.
const CATALOGO = ["/cursos", "/cursos/empresa/*", "/cursos/pack/*", "/cursos/entidad/*"] as const;

// LOTE02 (AL6): el alumno, solo los cursos de entidad (alumno.catalogo.cursos-plataforma).
const CATALOGO_ALUMNO = ["/cursos", "/cursos/entidad/*"] as const;

// LOTE02 (E13): perfil de entidad /entidades/<slug>, con sesión y sin indexar.
// Lo abren todos los roles; la página decide qué ve cada uno (completo, capado
// o 404) con la regla del §4 del lote.
const PERFIL_ENTIDAD = "/entidades/*";

/** Pantallas abiertas de cada rol en V0. */
export const RUTAS_V0: Record<Role, readonly string[]> = {
  // Perfil, ficha laboral, CV y formación previa, invitaciones, cursos para ti,
  // cartera de SkillPoints y la bolsa de ofertas (tarjeta «Próximamente»; el
  // detalle de una oferta vuelve a /ofertas sin consultar nada).
  STUDENT: [
    "/perfil",
    "/perfil/datos/**",
    "/perfil/externo/**",
    "/perfil/invitaciones/**",
    // LOTE03 (L3-19): Meet and Greet, conversaciones con las empresas.
    "/perfil/meet-and-greet/**",
    "/perfil/cursos",
    "/perfil/skp",
    // LOTE06 (L6-01 a L6-04): «Evaluaciones» (el hub) y cada evaluación (portada,
    // consentimiento, test e informe). /perfil/competencias, el hub de antes, lleva
    // al nuevo. ECOE no tiene pantalla (sale «Próximamente» en el hub).
    "/perfil/evaluaciones",
    "/perfil/acat/**",
    "/perfil/erop/**",
    "/perfil/echo/**",
    "/perfil/evop/**",
    "/perfil/competencias",
    "/ofertas/**",
    ...CATALOGO_ALUMNO,
    PERFIL_ENTIDAD,
  ],
  // Resumen, perfil (con «Proponer») y el match de formaciones. LOTE01 (F4):
  // «Mis entidades» y el espacio formativo de cada una (la página comprueba
  // en el servidor que el vínculo esté APPROVED).
  TRAINER: [
    "/formador",
    "/formador/perfil/**",
    "/formador/formaciones/**",
    "/formador/entidades",
    "/formador/entidades/*",
    // LOTE05 (L5-07): el chat con una entidad (con el vínculo pendiente o aprobado;
    // la página lo comprueba en el servidor).
    "/formador/entidades/mensajes/*",
    // LOTE09 (d5, K50): «Informes para revisar» y el informe de cada persona.
    "/formador/evaluaciones",
    "/formador/evaluaciones/*",
    ...CATALOGO,
    PERFIL_ENTIDAD,
  ],
  // Ficha, ofertas propias y publicar, buscar talento, invitaciones,
  // SkillPoints, P&C, plan formativo (con la solicitud de formación a una
  // entidad), formaciones y programación. La exportación de la programación va
  // por /api/empresa/programacion/exportar (fuera del proxy, con su propia
  // comprobación de sesión y rol).
  //
  // LOTE02: «Validación de la cuenta» (/empresa/alta, V1/V2) y, dentro del plan
  // formativo, «Crédito» y «Catálogo» (E10, E11), que ya cubre
  // /empresa/plan-formativo/**.
  COMPANY: [
    "/empresa",
    "/empresa/alta/**",
    "/empresa/ofertas",
    "/empresa/ofertas/publicar",
    "/empresa/candidatos/**",
    "/empresa/invitaciones/**",
    // LOTE03 (L3-19): Meet and Greet. El plan formativo (crédito y entidades,
    // L3-08 a L3-13) ya lo cubre /empresa/plan-formativo/**.
    "/empresa/meet-and-greet/**",
    // LOTE04 (L4-04): «Roles y permisos», solo la cuenta de la empresa (requireRole).
    // Las secciones que abre un rol a un alumno NO van en la lista del alumno: el
    // proxy deja pasar /empresa/** con cualquier rol y corta la guarda de cada
    // página (requireEmpresa(seccion), lib/guard.ts).
    "/empresa/roles",
    "/empresa/skp",
    "/empresa/trabajadores/**",
    // LOTE06 (L6-05, L6-06): la pestaña «Evaluaciones» de P&C (solicitudes,
    // desbloquear a un trabajador y lo desbloqueado) y el informe de la última
    // evaluación visible de un trabajador o de un candidato con la ficha
    // desbloqueada (estas dos ya las cubren /empresa/trabajadores/** y
    // /empresa/candidatos/**; van a la vista para que se lean juntas).
    "/empresa/evaluaciones/**",
    "/empresa/trabajadores/*/evaluacion/**",
    "/empresa/candidatos/*/evaluacion/**",
    "/empresa/plan-formativo/**",
    "/empresa/formaciones/**",
    "/empresa/programacion/**",
    ...CATALOGO,
    PERFIL_ENTIDAD,
  ],
  // Panel, alta pendiente (H4 de G01: la única que ve una entidad sin validar),
  // empresas, red de formadores, catálogo propio con alta, importación y
  // edición de cursos (G07 H1), programación con la ficha de cada
  // impartición, usuarios con acceso y la ficha de la entidad (G08b H1). Las
  // páginas y sus acciones exigen requireEntidadValidada y acotan a la entidad.
  //
  // LOTE02 (V1/V2): «Validación de la cuenta» (/portal/alta/**). La entidad
  // pendiente prepara su ficha, su alta y sus cursos (RUTAS_ENTIDAD_EN_PREPARACION,
  // lib/entidad/validacion.ts); el resto exige la validada.
  ENTITY: [
    "/portal",
    "/portal/pendiente",
    "/portal/alta/**",
    "/portal/empresas/**",
    "/portal/red",
    // LOTE05 (L5-15, L5-07): «Descubrir formadores» y el chat con un formador
    // (sección «formadores»). Nunca en la lista del alumno: la persona con un rol
    // entra por la guarda de cada página.
    "/portal/red/descubrir",
    "/portal/red/mensajes/*",
    "/portal/catalogo",
    "/portal/cursos/nuevo",
    "/portal/cursos/importar",
    "/portal/cursos/*/editar",
    // LOTE01 (F5): «Nueva convocatoria» desde la ficha de un curso propio.
    "/portal/cursos/*/convocatoria",
    "/portal/programacion/**",
    // LOTE01 (AL4): bandeja de solicitudes de inscripción.
    "/portal/inscripciones",
    // LOTE04 (L4-02, L4-04): la plantilla de la entidad y «Roles y permisos»
    // (solo la titular). Como en empresa, nunca en la lista del alumno.
    "/portal/plantilla",
    // LOTE06 (L6-05, L6-06): la ficha de una persona de la plantilla (con sus
    // evaluaciones), el informe de la última visible y la pestaña «Evaluaciones».
    "/portal/plantilla/*",
    "/portal/plantilla/*/evaluacion/**",
    "/portal/evaluaciones/**",
    "/portal/roles",
    // LOTE05 (L5-01): sin pestaña; sigue abierta para redirigir a /portal/plantilla.
    "/portal/usuarios",
    "/portal/ficha",
    // LOTE03 (L3-09): cartera de SkillPoints de la entidad (V0; /portal/skp sigue
    // en V1). «Descubrir empresas» ya lo cubre /portal/empresas/**.
    "/portal/skillpoints",
    ...CATALOGO,
    PERFIL_ENTIDAD,
  ],
  // Backoffice global (menos las secciones V1 de FUNCIONES_V1). LOTE02 (V3):
  // «Altas pendientes» (/admin/altas y /admin/altas/<id>) cuelga de /admin/**.
  ADMIN: ["/admin/**", ...CATALOGO, PERFIL_ENTIDAD],
};

/** El formato de patrones de RUTAS_V0 (arriba), para otras listas de rutas (lib/entidad/validacion.ts). */
export function casaRuta(pathname: string, patron: string): boolean {
  return casaPatron(pathname, patron);
}

/** ¿La ruta es de una función V1? Entonces está cerrada para todos. */
export function esRutaV1(pathname: string): boolean {
  return RUTAS_V1.some((p) => casaPatron(pathname, p));
}

/**
 * Rutas permitidas durante la fase actual. Con `role`, las de ese rol; sin él,
 * las de cualquier rol (proxy.ts no lee la sesión). Las de FUNCIONES_V1 nunca.
 */
export function isActivePath(pathname: string, role?: Role): boolean {
  if (esRutaV1(pathname)) return false;
  const listas = role ? [RUTAS_V0[role]] : Object.values(RUTAS_V0);
  return listas.some((lista) => lista.some((p) => casaPatron(pathname, p)));
}
