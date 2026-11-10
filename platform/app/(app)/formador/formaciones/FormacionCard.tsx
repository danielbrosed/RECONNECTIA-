import type { ReactNode } from "react";
import type { FormacionCardVM } from "@/lib/formaciones";
import { FORMACION_MODALITY_LABELS } from "@/lib/formaciones";
import { pesoDistancia } from "@/lib/modalidades";
import { etiquetasServicios } from "@/lib/servicios";
import { lineasFechas } from "@/lib/formaciones-sesiones-texto";
import { tituloNotaConvocatoria } from "@/lib/convocatoria-nota";

/** LOTE07 (L7-09): sesiones que se listan en «Cuándo»; del resto, «y N sesiones más». */
export const SESIONES_CARTA_MAX = 6;

/** «Cuándo» de la carta: una línea por sesión (como mucho SESIONES_CARTA_MAX), el rango de antes o «Por definir». */
export function lineasCuando(fechas: FormacionCardVM["fechas"]): string[] {
  const lineas = lineasFechas(fechas);
  if (lineas.length === 0) return ["Por definir"];
  if (lineas.length <= SESIONES_CARTA_MAX) return lineas;
  const resto = lineas.length - SESIONES_CARTA_MAX;
  return [...lineas.slice(0, SESIONES_CARTA_MAX), `y ${resto} ${resto === 1 ? "sesión más" : "sesiones más"}`];
}

// Carta presentacional de una formación recomendada. Lenguaje marfil/tinta,
// port del look de OfertaCard (panel/ofertas) pero con sello de afinidad y chips
// de especialidades con highlight de las que coinciden con el perfil. Las acciones
// (like/dismiss) las gobierna FormacionSwipeDeck (gesto + botones); los botones
// van DENTRO de la carta de arriba (arreglos finales, G2), por `acciones`.
export default function FormacionCard({ formacion, acciones }: { formacion: FormacionCardVM; acciones?: ReactNode }) {
  const modality = FORMACION_MODALITY_LABELS[formacion.modality] ?? formacion.modality;
  // LOTE07 (L7-09): por sesiones («Sesión 1: …», «Sesión 2: …»), no «desde-hasta».
  const cuando = lineasCuando(formacion.fechas);

  const modalidadValue =
    [
      modality,
      formacion.city || formacion.location,
      pesoDistancia(formacion.modality) > 0 && formacion.distanceKm != null
        ? `a ~${formacion.distanceKm} km de ti`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Sin dato";

  const rows: { label: string; value: string | string[] }[] = [
    { label: "Cuándo", value: cuando },
    { label: "Modalidad", value: modalidadValue },
    ...(formacion.servicios.length > 0
      ? [{ label: "Servicios", value: etiquetasServicios(formacion.servicios).join(" · ") }]
      : []),
    {
      label: "Horas · plazas",
      value: [formacion.hours > 0 ? `${formacion.hours} h` : null, formacion.capacity != null ? `${formacion.capacity} plazas` : null]
        .filter(Boolean)
        .join(" · ") || "Por definir",
    },
  ];

  const matched = new Set(formacion.matchedSpecialties.map((s) => s.toLowerCase()));

  return (
    <div className="card relative overflow-hidden border-l-2 border-l-[color:var(--color-ink)] select-none">
      {/* Sello de afinidad */}
      <div className="absolute top-3 right-3 text-right">
        <div className="font-mono text-lg leading-none font-medium">{formacion.affinity}%</div>
        <div className="eyebrow">afinidad</div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3 pr-16">
        <span className="eyebrow">Formación</span>
        {formacion.clientName && (
          <span className="eyebrow text-[color:var(--color-mute)]">› {formacion.clientName}</span>
        )}
      </div>

      <h3 className="h-card pr-16">{formacion.title}</h3>
      {formacion.description && (
        <p className="text-sm text-[color:var(--color-ink-soft)] mt-2 line-clamp-3">
          {formacion.description}
        </p>
      )}
      {/* LOTE09 (d28, Daniel: c): la nota de la convocatoria para el formador. */}
      {formacion.nota && (
        <div className="mt-3" data-nota-convocatoria>
          <div className="eyebrow">{tituloNotaConvocatoria(formacion.entidad)}</div>
          <p className="text-sm text-[color:var(--color-ink-soft)] mt-1 line-clamp-3 whitespace-pre-line [overflow-wrap:anywhere]">{formacion.nota}</p>
        </div>
      )}

      <div className="mt-4 border border-[color:var(--color-line)] divide-y divide-[color:var(--color-line)]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline gap-3 px-3 py-2">
            <span className="eyebrow w-28 shrink-0">{r.label}</span>
            {Array.isArray(r.value) ? (
              <span className="text-sm text-[color:var(--color-ink)]" data-cuando-carta>
                {r.value.map((l) => (
                  <span key={l} className="block">
                    {l}
                  </span>
                ))}
              </span>
            ) : (
              <span className="text-sm text-[color:var(--color-ink)]">{r.value}</span>
            )}
          </div>
        ))}
      </div>

      {formacion.requiredSpecialties.length > 0 && (
        <div className="mt-4">
          <div className="eyebrow mb-2">
            {formacion.matchedSpecialties.length} de {formacion.requiredSpecialties.length} coinciden con tu
            perfil
          </div>
          <div className="flex flex-wrap gap-1.5">
            {formacion.requiredSpecialties.map((s) => {
              const hit = matched.has(s.toLowerCase());
              return (
                <span
                  key={s}
                  className={
                    hit
                      ? "text-xs px-2 py-1 bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                      : "text-xs px-2 py-1 border border-[color:var(--color-line)] text-[color:var(--color-ink-soft)]"
                  }
                >
                  {s}
                </span>
              );
            })}
          </div>
        </div>
      )}

      {acciones && (
        <div className="mt-4 pt-3 border-t border-[color:var(--color-line)]" data-acciones-carta>
          {acciones}
        </div>
      )}
    </div>
  );
}
