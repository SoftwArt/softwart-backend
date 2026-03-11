import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

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