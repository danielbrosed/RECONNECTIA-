// Prefijos de los enlaces de un solo uso. Los de verificación de correo y los
// de invitación comparten tabla (VerificationToken), así que el propósito viaja
// en el propio texto del token: la pantalla de completar registro rechaza los
// de verificación para que un enlace de confirmación robado no sirva para
// fijar una contraseña sobre una cuenta ajena.
export const VERIFY_TOKEN_PREFIX = "ver_";
export const INVITE_TOKEN_PREFIX = "inv_";
// Restablecer contraseña de una cuenta que YA tiene una. Va aparte de los otros
// dos por el mismo motivo: un enlace de verificación o de invitación no debe
// servir para cambiar la contraseña de una cuenta activa, ni al revés.
export const RESET_TOKEN_PREFIX = "rst_";
