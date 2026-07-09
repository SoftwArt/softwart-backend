// src/services/email.service.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Remitente: requiere dominio verificado en Resend (softwart.online)
const EMAIL_FROM = process.env.EMAIL_FROM ?? "Arte Café <no-reply@softwart.online>";

const SITE_URL = "https://softwart.online";
// Base del frontend para construir links (en dev apunta a localhost:3000)
const FRONTEND_URL = process.env.FRONTEND_URL ?? SITE_URL;
const YEAR = new Date().getFullYear();

// Bloque de header compartido
function emailHeader(subtitle: string): string {
  return `
    <div style="background: #7c4a2d; padding: 28px 32px; border-radius: 8px 8px 0 0;">
      <a href="${SITE_URL}" style="text-decoration: none;">
        <h1 style="margin: 0; color: #fff; font-size: 22px; font-weight: 700; letter-spacing: -0.5px;">
          Arte Café
        </h1>
      </a>
      <p style="margin: 4px 0 0; color: rgba(255,255,255,0.70); font-size: 13px;">
        ${subtitle}
      </p>
    </div>
  `;
}

// Bloque de footer compartido
function emailFooter(): string {
  return `
    <div style="background: #f9f9f9; border: 1px solid #e5e5e5; border-top: none;
                border-radius: 0 0 8px 8px; padding: 16px 32px; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 12px; color: #aaa;">
        © ${YEAR} Arte Café ·
        <a href="${SITE_URL}" style="color: #7c4a2d; text-decoration: none;">softwart.online</a>
      </p>
      <p style="margin: 0; font-size: 11px; color: #ccc;">
        Este correo fue generado automáticamente, no respondas a este mensaje.
      </p>
    </div>
  `;
}

// ── Recuperación de contraseña ────────────────────────────────────────────────
export const sendRecoveryEmail = async (
  correo: string,
  token: string
): Promise<void> => {
  // Link de reset con el token de alta entropía en el query param. La página
  // /reset del frontend lo lee de la URL — el usuario no teclea nada.
  const resetUrl = `${FRONTEND_URL}/reset?token=${token}`;
  const { data, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: correo,
    subject: "Recuperación de contraseña — Arte Café",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; color: #1a1a1a;">

        ${emailHeader("Recuperación de contraseña")}

        <!-- Body -->
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="margin: 0 0 24px; font-size: 15px; color: #444;">
            Hemos recibido una solicitud para restablecer tu contraseña.
            Haz clic en el botón para crear una nueva:
          </p>

          <!-- Botón con el link de reset -->
          <div style="text-align: center; margin: 0 0 24px;">
            <a href="${resetUrl}" style="
              display: inline-block; background: #7c4a2d; color: #fff;
              text-decoration: none; font-size: 15px; font-weight: 600;
              padding: 14px 32px; border-radius: 8px;
            ">Restablecer contraseña</a>
          </div>

          <p style="margin: 0 0 8px; font-size: 13px; color: #777;">
            O copia y pega este enlace en tu navegador:
          </p>
          <p style="margin: 0 0 24px; font-size: 12px; color: #7c4a2d; word-break: break-all;">
            ${resetUrl}
          </p>

          <p style="margin: 0 0 8px; font-size: 14px; color: #555;">
            El enlace expira en <strong>15 minutos</strong> y solo puede usarse una vez.
          </p>
          <p style="margin: 0; font-size: 13px; color: #999;">
            Si no solicitaste esto, ignora este correo. Tu cuenta está segura.
          </p>
        </div>

        ${emailFooter()}

      </div>
    `,
  });
  if (error) throw new Error(`Resend error (recovery): ${error.message}`);
  console.log("✅ Email de recuperación enviado:", data?.id);
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
  const { data: sent, error } = await resend.emails.send({
    from: EMAIL_FROM,
    to: data.correo,
    subject: `Cita confirmada #${data.id_cita} — Arte Café`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; color: #1a1a1a;">

        ${emailHeader("Confirmación de cita")}

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
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600;">#${data.id_cita}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Fecha</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600; text-transform: capitalize;">
                  ${formatFecha(data.fecha)}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Hora</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600;">${to12h(data.hora)}</td>
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
            Si necesitas cancelarla, puedes hacerlo desde
            <a href="${SITE_URL}" style="color: #7c4a2d; text-decoration: none;">tu cuenta</a>
            antes de la fecha.
          </p>
        </div>

        ${emailFooter()}

      </div>
    `,
  });
  if (error) throw new Error(`Resend error (cita #${data.id_cita}): ${error.message}`);
  console.log(`✅ Confirmación cita #${data.id_cita} enviada:`, sent?.id);
};

// ── Alerta de nueva cita al admin ─────────────────────────────────────────────
export type AdminCitaAlertData = {
  nombreCliente: string
  fecha:         string
  hora:          string
  id_cita:       number
  observacion?:  string
  tipo:          "Invitado" | "Cliente registrado"
}

export const sendAdminNewAppointmentAlert = async (
  data: AdminCitaAlertData
): Promise<void> => {
  const adminEmail = process.env.ADMIN_EMAIL
  if (!adminEmail) return

  const { error } = await resend.emails.send({
    from:    EMAIL_FROM,
    to:      adminEmail,
    subject: `Nueva cita #${data.id_cita} — ${data.nombreCliente}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; color: #1a1a1a;">

        ${emailHeader("Nueva cita agendada")}

        <div style="background: #fff; padding: 32px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="margin: 0 0 20px; font-size: 15px; color: #444;">
            Un cliente ha agendado una nueva cita en el portal.
          </p>

          <div style="background: #fdf8f5; border: 1px solid #e8d5c4; border-radius: 8px; padding: 20px 24px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; width: 40%;">Número de cita</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600;">#${data.id_cita}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Cliente</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600;">${data.nombreCliente}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Fecha</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600; text-transform: capitalize;">
                  ${formatFecha(data.fecha)}
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Hora</td>
                <td style="padding: 8px 0; font-size: 13px; font-weight: 600;">${to12h(data.hora)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px;">Tipo</td>
                <td style="padding: 8px 0; font-size: 13px;">${data.tipo}</td>
              </tr>
              ${data.observacion ? `
              <tr>
                <td style="padding: 8px 0; color: #888; font-size: 13px; vertical-align: top;">Observación</td>
                <td style="padding: 8px 0; font-size: 13px;">${data.observacion}</td>
              </tr>` : ""}
            </table>
          </div>

          <p style="margin: 24px 0 0; font-size: 13px; color: #999;">
            Revisa el panel de administración para gestionar la cita.
          </p>
        </div>

        ${emailFooter()}

      </div>
    `,
  });
  if (error) throw new Error(`Resend error (alerta admin cita #${data.id_cita}): ${error.message}`);
  console.log(`✅ Alerta admin cita #${data.id_cita} enviada a: ${adminEmail}`);
};