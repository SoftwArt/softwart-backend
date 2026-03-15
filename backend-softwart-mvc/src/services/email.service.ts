// src/services/email.service.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ── Recuperación de contraseña ────────────────────────────────────────────────
export const sendRecoveryEmail = async (
  correo: string,
  token: string
): Promise<void> => {
  const info = await transporter.sendMail({
    from: `"SoftwArt" <${process.env.SMTP_USER}>`,
    to: correo,
    subject: "Recuperación de contraseña — SoftwArt",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
        <h2>Recuperar contraseña</h2>
        <p>Hemos recibido una solicitud para restablecer tu contraseña.</p>
        <p>Tu código de verificación es:</p>
        <div style="
          display: block; padding: 16px; background: #f4f4f4;
          border-radius: 6px; font-size: 32px; font-weight: bold;
          letter-spacing: 8px; text-align: center;
        ">${token}</div>
        <p style="margin-top: 16px;">
          Ingresa este código en la pantalla de recuperación.
          Expira en <strong>15 minutos</strong>.
        </p>
        <p style="margin-top: 24px; color: #888; font-size: 12px;">
          Si no solicitaste esto, ignora este correo.
        </p>
      </div>
    `,
  });
  console.log("✅ Email enviado:", info.messageId);
};

// ── Confirmación de cita agendada ─────────────────────────────────────────────
export type CitaConfirmacionData = {
  correo:       string
  nombreCliente: string
  fecha:        string   // "2025-03-15"
  hora:         string   // "14:00"
  id_cita:      number
}

function to12h(hora: string): string {
  const [h, m] = hora.split(":").map(Number);
  const suffix = h >= 12 ? "p.m." : "a.m.";
  const h12    = h > 12 ? h - 12 : h === 0 ? 12 : h;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatFecha(fecha: string): string {
  // "2025-03-15" → "sábado, 15 de marzo de 2025"
  const d = new Date(fecha + "T00:00:00");
  return d.toLocaleDateString("es-CO", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}

export const sendCitaConfirmacionEmail = async (
  data: CitaConfirmacionData
): Promise<void> => {
  const info = await transporter.sendMail({
    from: `"SoftwArt" <${process.env.SMTP_USER}>`,
    to: data.correo,
    subject: `Cita confirmada #${data.id_cita} — SoftwArt`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; color: #1a1a1a;">

        <!-- Header -->
        <div style="background: #7c4a2d; padding: 28px 32px; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700;">SoftwArt</h1>
          <p style="margin: 4px 0 0; color: rgba(255,255,255,0.75); font-size: 13px;">
            Confirmación de cita
          </p>
        </div>

        <!-- Body -->
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="margin: 0 0 16px; font-size: 15px;">
            Hola, <strong>${data.nombreCliente}</strong> 👋
          </p>
          <p style="margin: 0 0 24px; font-size: 15px; color: #444;">
            Tu cita ha sido agendada exitosamente. Aquí están los detalles:
          </p>

          <!-- Tarjeta de cita -->
          <div style="background: #fdf8f5; border: 1px solid #e8d5c4; border-radius: 8px; padding: 20px 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; width: 40%;">Número de cita</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600;">
                  #${data.id_cita}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Fecha</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600; text-transform: capitalize;">
                  ${formatFecha(data.fecha)}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Hora</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600;">
                  ${to12h(data.hora)}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Estado</td>
                <td style="padding: 8px 0;">
                  <span style="
                    display: inline-block; padding: 2px 10px; border-radius: 99px;
                    background: #fef3c7; color: #92400e; font-size: 12px; font-weight: 600;
                  ">Pendiente de confirmación</span>
                </td>
              </tr>
            </table>
          </div>

          <p style="margin: 24px 0 0; font-size: 14px; color: #555;">
            Nos pondremos en contacto contigo para confirmar la cita.
            Si necesitas cancelarla, puedes hacerlo desde tu cuenta antes de la fecha.
          </p>
        </div>

        <!-- Footer -->
        <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-top: none;
                    border-radius: 0 0 8px 8px; padding: 16px 32px;">
          <p style="margin: 0; color: #aaa; font-size: 12px;">
            © ${new Date().getFullYear()} SoftwArt · Este correo fue generado automáticamente, no respondas a este mensaje.
          </p>
        </div>

      </div>
    `,
  });
  console.log(`✅ Confirmación cita #${data.id_cita} enviada:`, info.messageId);
};