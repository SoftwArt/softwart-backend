// src/helpers/inviteToken.helper.ts
// Fuente única para tokens de recuperación/invitación — el hash SHA-256 es
// irreversible si se filtra la BD (OWASP A02), el mismo criterio que ya usaba
// AuthController para recover/resendCode.
import crypto from "crypto";

export const hashToken = (token: string): string =>
  crypto.createHash("sha256").update(token).digest("hex");

export function generateToken(horasExpira: number): { token: string; tokenHash: string; expira: Date } {
  const token = crypto.randomBytes(32).toString("hex");
  return {
    token,
    tokenHash: hashToken(token),
    expira: new Date(Date.now() + horasExpira * 60 * 60 * 1000),
  };
}
