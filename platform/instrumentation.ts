// Convención `instrumentation.ts` de Next: `register()` corre una vez por servidor
// al arrancar. Solo interesa el runtime de Node (es el que calcula IPs para el
// rate-limit); en Edge no se carga `lib/net`.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { warnIfTrustedProxyHopsUnset } = await import("@/lib/net");
  warnIfTrustedProxyHopsUnset();
}
