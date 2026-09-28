// Correos del alta de una entidad (H4): aviso de validación y de rechazo por
// administración. La razón social y el nombre los escribió la propia entidad al
// registrarse y el motivo lo escribe un administrador: ninguno es texto de
// confianza para meterlo en HTML, así que se escapan. El layout interpola el
// título sin escapar, por eso se escapa aquí antes de pasárselo.

import { CONTACTO_VALIDACION } from "@/lib/entidad/validacion";
import { emailLayout, emailParagraph } from "@/lib/emails/layout";

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function primerNombre(nombre: string): string {
  return escapeHtml(nombre.trim().split(/\s+/)[0] || "Hola");
}

/** Base pública de la app, sin barra final, para el enlace del botón. */
function baseUrl(): string {
  return (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "").replace(/\/+$/, "");
}

export function entidadValidadaEmail(input: {
  legalName: string;
  nombre: string;
}): { subject: string; html: string } {
  const legal = escapeHtml(input.legalName);
  const nombre = primerNombre(input.nombre);

  return {
    subject: "Tu entidad ya está validada en Reconnect.iA",
    html: emailLayout({
      eyebrow: "Entidad · Alta validada",
      titulo: `${nombre}, ya puedes entrar en tu portal`,
      cuerpoHtml: [
        emailParagraph(`Hemos revisado el alta de <strong>${legal}</strong> y está aprobada.`),
        emailParagraph(
          "A partir de ahora puedes gestionar tu entidad desde el portal de Reconnect.iA: las empresas con las que trabajas, tu red de formadores, tu catálogo y la programación.",
        ),
        emailParagraph("Entra con el correo y la contraseña con los que te registraste."),
      ].join(""),
      cta: { label: "Entrar en mi portal", href: `${baseUrl()}/portal` },
    }),
  };
}

export function entidadRechazadaEmail(input: {
  legalName: string;
  nombre: string;
  motivo: string;
}): { subject: string; html: string } {
  const legal = escapeHtml(input.legalName);
  const nombre = primerNombre(input.nombre);
  const motivo = escapeHtml(input.motivo.trim()).replace(/\r?\n/g, "<br>");

  return {
    subject: `Sobre el alta de ${input.legalName} en Reconnect.iA`,
    html: emailLayout({
      eyebrow: "Entidad · Alta revisada",
      titulo: "No hemos podido aprobar el alta",
      cuerpoHtml: [
        emailParagraph(
          `${nombre}, hemos revisado el alta de <strong>${legal}</strong> y, por ahora, no la hemos aprobado. Este es el motivo:`,
        ),
        `<blockquote style="margin:0 0 16px;padding:12px 16px;border-left:3px solid #161514;background:#EAE6DF;font-size:15px;line-height:1.6;color:#292724;">${motivo}</blockquote>`,
        emailParagraph(
          `Si crees que se trata de un error, o puedes aportar más información, escríbenos a <a href="mailto:${CONTACTO_VALIDACION}" style="color:#161514;font-weight:700;">${CONTACTO_VALIDACION}</a> indicando el nombre de tu entidad. Revisaremos tu caso.`,
        ),
      ].join(""),
    }),
  };
}
