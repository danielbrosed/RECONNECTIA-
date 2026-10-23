"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition, type MouseEvent } from "react";
import { CLAVE_AREA_DELEGADA, activeArea, isTabActive, type NavArea } from "@/lib/nav";
import { RED_SEGURIDAD_NAVEGACION_MS } from "@/lib/config-ui";
import { MSG_NAVEGACION, faseNavegacion, type FaseNavegacion } from "@/lib/ui/navegacion-aviso";
import Burbuja from "@/app/_ui/Burbuja";

// Sin prefetch en los enlaces: son rutas dinámicas con sesión y el tropel de
// prefetches tras cada acción de servidor no aporta nada (y compite con la
// respuesta de la acción en el enrutador del cliente).
// Navegación VISIBLE: si el rol tiene >1 área, se muestran todas las áreas
// (fila de "pills") y debajo las pestañas del área activa. Todo se ajusta en
// varias líneas (flex-wrap) → ningún destino queda recortado por scroll.
// LOTE02 (G3): lo de la cuenta va al menú bajo el nombre (MenuCuenta.tsx);
// sus áreas son OCULTAS (sin pill) pero, dentro, enseñan sus pestañas. Las
// áreas llegan ya filtradas para la cuenta (navegacionDe en el layout) y
// `rutasMenu` evita que una pestaña raíz se ilumine en una pantalla del menú.
// `badges` (opcional): contador por href de pestaña, p. ej. las solicitudes
// pendientes del administrador. Sin él, el render es el de siempre.
//
// LOTE01 (A9/AL1): cada pulsación tiene respuesta visible y entra a la primera.
//  - Mientras navega, la pestaña pulsada lleva aria-busy y un indicador
//    (useLinkStatus), y el aviso de abajo dice «Cargando…».
//  - Si tarda, «Está tardando más de lo normal…» y, si a los
//    RED_SEGURIDAD_NAVEGACION_MS no ha cambiado de pantalla, se carga la
//    página entera (window.location.assign): la navegación del enrutador ya no
//    se puede quedar esperando detrás de una transición colgada.
//  - Sin conexión, no se intenta y se dice por qué.
//  - Pulsar la pestaña de la pantalla en la que ya se está refresca sus datos
//    y sube al principio (antes no hacía nada visible).
//
// LOTE04 (L4-05): el área «Gestión · <organización>» del alumno con un rol
// (key CLAVE_AREA_DELEGADA) lleva data-area-delegada y no enseña burbujas: los
// contadores de la organización son de su titular.
export default function AppNav({
  areas,
  badges,
  rutasMenu = [],
}: {
  areas: NavArea[];
  badges?: Record<string, number>;
  rutasMenu?: string[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const area = activeArea(areas, pathname);
  const visibles = areas.filter((a) => !a.oculta);
  const [destino, setDestino] = useState<string | null>(null);
  const [fase, setFase] = useState<FaseNavegacion | null>(null);
  const [refrescando, startRefresco] = useTransition();
  const temporizadores = useRef<number[]>([]);

  const parar = useCallback(() => {
    for (const t of temporizadores.current) window.clearTimeout(t);
    temporizadores.current = [];
  }, []);

  // Al llegar a otra pantalla, se acaba la espera (estado derivado de la ruta).
  const [rutaVista, setRutaVista] = useState(pathname);
  if (rutaVista !== pathname) {
    setRutaVista(pathname);
    setDestino(null);
    setFase(null);
  }
  // LOTE02: con app/loading.tsx el enrutador cambia la URL al pintar «Cargando…»
  // (CargandoSeccion, data-cargando-pantalla) antes de tener la pantalla: si es
  // eso lo que se ve, la red de seguridad sigue en marcha.
  useEffect(() => {
    if (!document.querySelector("[data-cargando-pantalla]")) parar();
  }, [pathname, parar]);
  useEffect(() => parar, [parar]);

  useEffect(() => {
    const sinRed = () => {
      if (destino) setFase("sinRed");
    };
    window.addEventListener("offline", sinRed);
    return () => window.removeEventListener("offline", sinRed);
  }, [destino]);

  const alPulsar = useCallback(
    (e: MouseEvent<HTMLAnchorElement>, href: string) => {
      // Otra pestaña del navegador, tecla modificadora o el aviso de cambios sin
      // guardar ya se ha quedado con el clic: no es cosa de esta barra.
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      parar();
      if (typeof navigator !== "undefined" && navigator.onLine === false) {
        e.preventDefault();
        setDestino(href);
        setFase("sinRed");
        return;
      }
      const objetivo = new URL(href, window.location.href);
      if (objetivo.pathname === window.location.pathname && objetivo.search === window.location.search) {
        // Ya está aquí: datos frescos y al principio de la pantalla.
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: "smooth" });
        setDestino(href);
        startRefresco(() => router.refresh());
        return;
      }
      setDestino(href);
      setFase("cargando");
      const inicio = Date.now();
      const revisar = () => {
        const llegado =
          window.location.pathname === objetivo.pathname &&
          window.location.search === objetivo.search &&
          !document.querySelector("[data-cargando-pantalla]");
        if (llegado) return;
        const f = faseNavegacion(Date.now() - inicio, typeof navigator === "undefined" ? true : navigator.onLine);
        setFase(f);
        if (f === "recargando") window.location.assign(objetivo.href);
      };
      temporizadores.current.push(
        window.setTimeout(revisar, Math.round(RED_SEGURIDAD_NAVEGACION_MS / 2)),
        window.setTimeout(revisar, RED_SEGURIDAD_NAVEGACION_MS),
      );
    },
    [parar, router],
  );

  if (!area) return null;

  // Si el área activa solo tiene una pestaña que ES su propio basePath, la fila
  // de pestañas sería redundante con el pill del área → no se muestra.
  const showTabs = !(area.tabs.length === 1 && area.tabs[0].href === area.basePath);
  const ocupado = (href: string) => (destino === href && (fase === "cargando" || fase === "lento" || fase === "recargando")) || (refrescando && destino === href);
  const aviso = fase ? MSG_NAVEGACION[fase] : refrescando ? MSG_NAVEGACION.cargando : "";

  return (
    <div className="px-4 sm:px-12 pb-1">
      {visibles.length > 1 && (
        <div className="flex flex-wrap gap-1.5 py-2" data-nav-areas>
          {visibles.map((a) => {
            const active = a.key === area.key;
            const delegada = a.key === CLAVE_AREA_DELEGADA;
            // LOTE02: la burbuja del área suma las de sus pestañas (P&C tiene una sola
            // pestaña y no enseña la fila). LOTE04: el área delegada, sin burbujas.
            const avisosArea = delegada ? 0 : a.tabs.reduce((s, t) => s + (badges?.[t.href] ?? 0), 0);
            return (
              <Link
                key={a.key}
                prefetch={false}
                href={a.basePath}
                onClick={(e) => alPulsar(e, a.basePath)}
                aria-busy={ocupado(a.basePath) || undefined}
                data-area-delegada={delegada ? a.label : undefined}
                className={`relative px-3 py-1.5 text-sm border transition-colors whitespace-nowrap ${
                  active
                    ? "border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                    : "border-[color:var(--color-line)] text-[color:var(--color-ink-soft)] hover:border-[color:var(--color-ink)]"
                }`}
              >
                {a.label}
                {/* LOTE05 (L5-06): burbuja rellena (app/_ui/Burbuja.tsx). */}
                <Burbuja n={avisosArea} className="ml-1.5" datos={{ "data-nav-burbuja": avisosArea }} />
                <IndicadorCarga forzado={ocupado(a.basePath)} />
              </Link>
            );
          })}
        </div>
      )}
      {showTabs && (
        <nav className="flex flex-wrap gap-x-1 gap-y-0.5" data-nav-pestanas data-area-delegada-pestanas={area.key === CLAVE_AREA_DELEGADA || undefined}>
          {area.tabs.map((tab) => {
            const active = isTabActive(tab, area, pathname, rutasMenu);
            const n = area.key === CLAVE_AREA_DELEGADA ? 0 : (badges?.[tab.href] ?? 0);
            return (
              <Link
                key={tab.href}
                prefetch={false}
                href={tab.href}
                onClick={(e) => alPulsar(e, tab.href)}
                aria-busy={ocupado(tab.href) || undefined}
                className={`relative px-3 py-2 text-sm whitespace-nowrap border-b-2 -mb-px transition-colors ${
                  active
                    ? "border-[color:var(--color-ink)] font-medium"
                    : "border-transparent text-[color:var(--color-mute)] hover:text-[color:var(--color-ink)]"
                }`}
              >
                {tab.label}
                <Burbuja n={n} className="ml-1.5" datos={{ "data-pestana-burbuja": tab.href }} />
                <IndicadorCarga forzado={ocupado(tab.href)} />
              </Link>
            );
          })}
        </nav>
      )}
      <p
        role="status"
        aria-live="polite"
        data-aviso-navegacion
        className={aviso ? "mt-1 text-xs text-[color:var(--color-ink-soft)]" : "sr-only"}
      >
        {aviso}
      </p>
    </div>
  );
}

/**
 * Raya animada bajo la pestaña mientras su navegación está en marcha. Lee el
 * estado del propio Link (useLinkStatus) y, por si el enrutador no lo da, el
 * de la barra (`forzado`).
 */
function IndicadorCarga({ forzado }: { forzado: boolean }) {
  const { pending } = useLinkStatus();
  const activo = pending || forzado;
  return (
    <span
      aria-hidden="true"
      data-navegando={activo ? "true" : undefined}
      className={`pointer-events-none absolute left-1 right-1 -bottom-[3px] h-[3px] overflow-hidden ${activo ? "" : "invisible"}`}
    >
      <span className="block h-full w-1/3 animate-[rci-carga_1s_ease-in-out_infinite] bg-[color:var(--color-ink)]" />
    </span>
  );
}
