"use client";

import { useActionState, useEffect } from "react";
import ModalShell from "./panel/ofertas/ModalShell";
import { addAgendaItemAction, type SimpleState } from "./actions";

const INITIAL: SimpleState = { ok: false };

// Alta de una entrada personal en la agenda del formador. Copy deliberadamente
// genérico: son sus eventos y tareas, sin más.
export default function AgendaEventModal({
  defaultDate,
  onClose,
}: {
  defaultDate: string;
  onClose: () => void;
}) {
  const [state, action, pending] = useActionState(addAgendaItemAction, INITIAL);

  useEffect(() => {
    if (state.ok) onClose();
  }, [state.ok, onClose]);

  return (
    <ModalShell onClose={onClose} labelledBy="agenda-add-title" className="max-w-md">
      <form action={action} className="space-y-4">
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

        {!state.ok && state.error && (
          <p className="text-sm border border-[color:var(--color-ink)] p-2">{state.error}</p>
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
