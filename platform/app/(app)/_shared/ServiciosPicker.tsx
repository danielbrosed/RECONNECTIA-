"use client";

// Selector múltiple de SERVICIOS (lib/servicios.ts). Extrae la rejilla que
// estaba triplicada por copia y pega en los tres formularios de perfil (alumno,
// empresa y formador) y sirve además para el alta de formación, que hasta la
// ronda 6 usaba un <select> de un solo valor.
//
// Emite un <input type="hidden" name={name}> por servicio marcado, de modo que
// el server action lo lee con formData.getAll(name) igual que hacía con los
// sectores. El componente es controlado por dentro: quien lo monta solo pasa el
// valor inicial.

import { useState } from "react";
import { SERVICIOS, SERVICIO_LABELS, SERVICIOS_MAX, normalizarServicios } from "@/lib/servicios";

type Props = {
  /** Nombre del campo del formulario. Por convención, "servicios". */
  name?: string;
  /** Servicios ya marcados al abrir. */
  defaultValue?: readonly string[];
  label?: string;
  hint?: string;
  /** Tope de servicios marcables. Por defecto, el de lib/servicios. */
  max?: number;
  /** Se llama en cada cambio, para los formularios que llevan estado propio. */
  onChange?: (servicios: string[]) => void;
};

export default function ServiciosPicker({
  name = "servicios",
  defaultValue = [],
  label = "Servicios",
  hint = "Marca todos los que apliquen. Con ellos se calculan las recomendaciones y la afinidad.",
  max = SERVICIOS_MAX,
  onChange,
}: Props) {
  const [valores, setValores] = useState<string[]>(() => normalizarServicios(defaultValue));
  const [aviso, setAviso] = useState<string | null>(null);

  function alternar(s: string) {
    setValores((prev) => {
      let siguiente: string[];
      if (prev.includes(s)) {
        siguiente = prev.filter((x) => x !== s);
        setAviso(null);
      } else if (prev.length >= max) {
        setAviso(`Puedes elegir hasta ${max} servicios. Quita uno para añadir otro.`);
        return prev;
      } else {
        siguiente = [...prev, s];
        setAviso(null);
      }
      onChange?.(siguiente);
      return siguiente;
    });
  }

  return (
    <div>
      <label className="label-field">
        {label} ({valores.length}/{max})
      </label>
      {hint && <p className="text-xs text-[color:var(--color-mute)] mb-3">{hint}</p>}

      <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
        {SERVICIOS.map((s) => {
          const marcado = valores.includes(s);
          return (
            <button
              key={s}
              type="button"
              aria-pressed={marcado}
              onClick={() => alternar(s)}
              className={`px-3 py-2 text-sm text-left border transition-colors ${
                marcado
                  ? "border-[color:var(--color-ink)] bg-[color:var(--color-ink)] text-[color:var(--color-paper)]"
                  : "border-[color:var(--color-line)] bg-[color:var(--color-paper)] hover:bg-[color:var(--color-paper-alt)]"
              }`}
            >
              {marcado ? "✓ " : ""}
              {SERVICIO_LABELS[s]}
            </button>
          );
        })}
      </div>

      {valores.map((s) => (
        <input key={s} type="hidden" name={name} value={s} />
      ))}

      {aviso && <p className="text-xs text-[color:var(--color-mute)] mt-2">{aviso}</p>}
    </div>
  );
}
