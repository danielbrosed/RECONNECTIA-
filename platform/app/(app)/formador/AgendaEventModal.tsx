"use client";

import { startTransition, useActionState, useEffect, useState, type FormEvent } from "react";
import ModalShell from "./panel/ofertas/ModalShell";
import { addAgendaItemAction, type SimpleState } from "./actions";

const INITIAL: SimpleState = { ok: false };

// Si la llamada falla (sin conexión, servidor caído) se avisa en el modal en
// vez de dejar que el error tumbe la pantalla.
async function guardar(prev: SimpleState, datos: FormData): Promise<SimpleState> {
  try {
    return await addAgendaItemAction(prev, datos);
  } catch {
    return { ok: false, error: "No se pudo guardar. Revisa tu conexión e inténtalo de nuevo." };
  }
}

// Alta de una entrada personal en la agenda del formador. Copy deliberadamente
// genérico: son sus eventos y tareas, sin más.
export default function AgendaEventModal({
  defaultDate,
  onClose,
}: {
  defaultDate: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(guardar, INITIAL);
  const [avisoLocal, setAvisoLocal] = useState<string | null>(null);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  // Se envía con onSubmit y no con action=: React 19 vacía el formulario al
  // acabar la acción aunque devuelva un error, y se perdería lo escrito. Las
  // horas se comprueban aquí para avisar antes, pero la regla vale en servidor.
  function enviar(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const datos = new FormData(e.currentTarget);
    const desde = String(datos.get("timeFrom") ?? "");
    const hasta = String(datos.get("timeTo") ?? "");
    if (hasta && !desde) return setAvisoLocal("Indica también la hora de inicio.");
    if (desde && hasta && hasta < desde) {
      return setAvisoLocal("La hora de fin no puede ser anterior a la de inicio.");
    }
    setAvisoLocal(null);
    startTransition(() => action(datos));
  }

  const error = avisoLocal ?? (!state.ok ? state.error : null);

  return (
    <ModalShell onClose={onClose} labelledBy="agenda-add-title" className="max-w-md">
      <form onSubmit={enviar} className="space-y-4">
        <div>
          <span className="eyebrow">Agenda</span>
          <h3 id="agenda-add-title" className="h-card mt-1">
            Añadir a tu calendario
          </h3>
        </div>

        <div>
          <label htmlFor="ag-title" className="label-field">
            Título
          </label>
          <input
            id="ag-title"
            name="title"
            type="text"
            required
            minLength={2}
            maxLength={160}
            placeholder="Sesión, reunión, entrega..."
            className="input-field"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ag-kind" className="label-field">
              Tipo
            </label>
            <select id="ag-kind" name="kind" defaultValue="evento" className="input-field">
              <option value="evento">Evento</option>
              <option value="tarea">Tarea</option>
            </select>
          </div>
          <div>
            <label htmlFor="ag-date" className="label-field">
              Fecha
            </label>
            <input
              id="ag-date"
              name="date"
              type="date"
              required
              min="2000-01-01"
              max="2100-12-31"
              defaultValue={defaultDate}
              className="input-field"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="ag-from" className="label-field">
              Desde (opcional)
            </label>
            <input id="ag-from" name="timeFrom" type="time" className="input-field" />
          </div>
          <div>
            <label htmlFor="ag-to" className="label-field">
              Hasta (opcional)
            </label>
            <input id="ag-to" name="timeTo" type="time" className="input-field" />
          </div>
        </div>

        <div>
          <label htmlFor="ag-notes" className="label-field">
            Notas (opcional)
          </label>
          <textarea
            id="ag-notes"
            name="notes"
            rows={2}
            maxLength={500}
            className="input-field"
          />
        </div>

        {error && (
          <p role="alert" className="text-sm border border-[color:var(--color-ink)] p-2">
            {error}
          </p>
        )}

        <div className="flex gap-3 justify-end">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancelar
          </button>
          <button type="submit" disabled={pending} className="btn-solid">
            {pending ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </form>
    </ModalShell>
  );
}
