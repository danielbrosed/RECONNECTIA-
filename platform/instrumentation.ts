// Convención `instrumentation.ts` de Next: `register()` corre una vez por servidor
// al arrancar. Solo interesa el runtime de Node (es el que calcula IPs para el
// rate-limit); en Edge no se carga `lib/net`.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { warnIfTrustedProxyHopsUnset } = await import("@/lib/net");
  warnIfTrustedProxyHopsUnset();
  // G13 seguridad S2 (M2): sin una DATA_ENCRYPTION_KEY válida la web no puede
  // leer ni guardar DNI, NAF ni IBAN. Se avisa al arrancar, con un error claro en
  // el registro, en vez de esperar a la primera ficha laboral.
  const { comprobarClaveAlArrancar } = await import("@/lib/cifrado-datos");
  comprobarClaveAlArrancar();
  // LOTE01 (A8): sin la dirección pública en producción, los correos llevarían
  // enlaces rotos; y un remitente que no es de reconnectia.es, aviso.
  const { comprobarCorreoAlArrancar } = await import("@/lib/email-config");
  comprobarCorreoAlArrancar();
}
