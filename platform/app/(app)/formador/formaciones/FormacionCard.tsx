import type { FormacionCardVM } from "@/lib/formaciones";
import { FORMACION_MODALITY_LABELS } from "@/lib/formaciones";
import { etiquetasServicios } from "@/lib/servicios";

// Carta presentacional de una formación recomendada. Lenguaje marfil/tinta,
// port del look de OfertaCard (panel/ofertas) pero con sello de afinidad y chips
// de especialidades con highlight de las que coinciden con el perfil. Sin botones:
// las acciones (like/dismiss) las gobierna FormacionSwipeDeck (gesto + botones).
export default function FormacionCard({ formacion }: { formacion: FormacionCardVM }) {
  const modality = FORMACION_MODALITY_LABELS[formacion.modality] ?? formacion.modality;
  const startStr = formacion.startDate
    ? `${fmt(formacion.startDate)}${formacion.startTime ? " " + formacion.startTime : ""}`
    : null;
  const endStr = formacion.endDate
    ? `${fmt(formacion.endDate)}${formacion.endTime ? " " + formacion.endTime : ""}`
    : null;
  const cuando = startStr ? (endStr ? `${startStr} – ${endStr}` : `Desde ${startStr}`) : "Por definir";

  const modalidadValue =
    [
      modality,
      formacion.city || formacion.location,
      formacion.modality !== "ONLINE" && formacion.distanceKm != null
        ? `a ~${formacion.distanceKm} km de ti`
        : null,
    ]
      .filter(Boolean)
      .join(" · ") || "Sin dato";

  const rows: { label: string; value: string }[] = [
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

      <div className="mt-4 border border-[color:var(--color-line)] divide-y divide-[color:var(--color-line)]">
        {rows.map((r) => (
          <div key={r.label} className="flex items-baseline gap-3 px-3 py-2">
            <span className="eyebrow w-28 shrink-0">{r.label}</span>
            <span className="text-sm text-[color:var(--color-ink)]">{r.value}</span>
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
    </div>
  );
}

function fmt(iso: string): string {
  const [y, m, d] = iso.split("-");
  return y && m && d ? `${d}/${m}/${y}` : iso;
}
