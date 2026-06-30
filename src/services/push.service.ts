// src/services/push.service.ts
// Notificaciones push (Firebase Cloud Messaging) al personal admin/empleado.
// Se envían a un "topic" (staff) — los dispositivos se suscriben al iniciar
// sesión en la app móvil, así no hace falta guardar tokens por usuario.
//
// Fail-soft: si las credenciales de Firebase no están configuradas en el
// entorno, las funciones son no-op (igual que el guard de ADMIN_EMAIL).
import admin from "firebase-admin";

const STAFF_TOPIC = "staff";

let initialized = false;

function ensureInit(): boolean {
  if (initialized) return true;

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // La clave privada del .env trae los saltos de línea escapados (\n)
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) return false;

  admin.initializeApp({
    credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
  });
  initialized = true;
  return true;
}

export type NewAppointmentPush = {
  nombreCliente: string;
  fecha:         string;
  hora:          string;
  id_cita:       number;
};

// Notifica al personal (topic "staff") que se agendó una nueva cita.
export const notifyNewAppointment = async (
  data: NewAppointmentPush
): Promise<void> => {
  if (!ensureInit()) return;

  await admin.messaging().send({
    topic: STAFF_TOPIC,
    notification: {
      title: "Nueva cita agendada",
      body:  `${data.nombreCliente} · ${data.fecha} ${data.hora}`,
    },
    data: {
      tipo:    "nueva_cita",
      id_cita: String(data.id_cita),
    },
    android: { priority: "high" },
  });
};
