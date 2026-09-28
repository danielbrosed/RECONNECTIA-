// Verificación de correo separada de Prisma y de Next para poder probarla con
// dobles (lib/verify-email.test.ts). La acción de servidor de
// app/(auth)/verificar-email/[token]/actions.ts solo cablea estas dependencias
// contra la base, aplica el límite por IP y redirige.
//
// Los tres tipos de enlace de un solo uso (verificación, invitación y
// restablecer contraseña) comparten la tabla VerificationToken, así que el
// propósito viaja en el prefijo del token (lib/tokens.ts). Aquí solo se acepta
// el de verificación: un enlace de invitación o de restablecer que llegue a esta
// pantalla se rechaza ANTES de consultar la base, con lo que ni se gasta ni se
// marca como verificada una cuenta que no ha confirmado su correo.
import { VERIFY_TOKEN_PREFIX } from "@/lib/tokens";

export const MSG_ENLACE_NO_VALIDO = "El enlace no es válido o ha caducado.";
export const MSG_FALTA_TOKEN = "Falta el token de verificación.";
export const MSG_SIN_CUENTA = "No encontramos tu cuenta.";

export type VerifyEmailDeps = {
  findToken(token: string): Promise<{ identifier: string; expires: Date } | null>;
  findUserByEmail(email: string): Promise<{ id: string } | null>;
  markVerified(userId: string): Promise<void>;
  deleteToken(token: string): Promise<void>;
  // Reloj inyectable para probar la caducidad sin depender de la hora real.
  now?: () => Date;
};

export type VerifyEmailResult = { ok: true } | { ok: false; error: string };

/** Solo los tokens emitidos para verificar el correo llevan este prefijo. */
export function isVerifyToken(token: string): boolean {
  return token.startsWith(VERIFY_TOKEN_PREFIX);
}

/**
 * Verifica el correo asociado a `token`. Devuelve `{ ok: true }` si la cuenta
 * ha quedado marcada como verificada, o el mensaje de error que se enseña al
 * usuario en caso contrario.
 */
export async function verifyEmailWithToken(
  token: string,
  deps: VerifyEmailDeps,
): Promise<VerifyEmailResult> {
  if (!token) return { ok: false, error: MSG_FALTA_TOKEN };

  // Sin consultar la base: una invitación (inv_) o un enlace de restablecer (rst_)
  // que lleguen aquí no se gastan ni marcan nada. Al usuario se le enseña el
  // mismo mensaje que con un enlace inexistente.
  if (!isVerifyToken(token)) return { ok: false, error: MSG_ENLACE_NO_VALIDO };

  const vt = await deps.findToken(token);
  const ahora = deps.now ? deps.now() : new Date();
  if (!vt || vt.expires < ahora) return { ok: false, error: MSG_ENLACE_NO_VALIDO };

  const user = await deps.findUserByEmail(vt.identifier);
  if (!user) return { ok: false, error: MSG_SIN_CUENTA };

  // Primero la cuenta y después el token: si el borrado fallase, el usuario ya
  // está verificado y el enlace sobrante caduca solo.
  await deps.markVerified(user.id);
  await deps.deleteToken(token);
  return { ok: true };
}
