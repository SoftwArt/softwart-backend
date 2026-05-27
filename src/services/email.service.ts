// src/services/email.service.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const SITE_URL = "https://softwart.online";
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
  const info = await transporter.sendMail({
    from: `"Arte Café" <${process.env.SMTP_USER}>`,
    to: correo,
    subject: "Recuperación de contraseña — Arte Café",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; color: #1a1a1a;">

        ${emailHeader("Recuperación de contraseña")}

        <!-- Body -->
        <div style="background: #fff; padding: 32px; border: 1px solid #e5e5e5; border-top: none;">
          <p style="margin: 0 0 16px; font-size: 15px; color: #444;">
            Hemos recibido una solicitud para restablecer tu contraseña.
            Tu código de verificación es:
          </p>

          <!-- Código OTP -->
          <div style="
            background: #fdf8f5; border: 1px solid #e8d5c4; border-radius: 8px;
            padding: 24px; text-align: center; margin: 0 0 24px;
          ">
            <span style="
              font-size: 36px; font-weight: 700; letter-spacing: 10px;
              color: #7c4a2d;
            ">${token}</span>
          </div>

          <p style="margin: 0 0 8px; font-size: 14px; color: #555;">
            Ingresa este código en la pantalla de recuperación.
            Expira en <strong>15 minutos</strong>.
          </p>
          <p style="margin: 0; font-size: 13px; color: #999;">
            Si no solicitaste esto, ignora este correo. Tu cuenta está segura.
          </p>
        </div>

        ${emailFooter()}

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
    from: `"Arte Café" <${process.env.SMTP_USER}>`,
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
  console.log(`✅ Confirmación cita #${data.id_cita} enviada:`, info.messageId);
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

  await transporter.sendMail({
    from:    `"Arte Café" <${process.env.SMTP_USER}>`,
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
  console.log(`✅ Alerta admin cita #${data.id_cita} enviada a: ${adminEmail}`);
};