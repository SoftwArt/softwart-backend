// src/legal/legalConfig.ts
//
// Datos del responsable y canales de contacto compartidos entre la Política
// de Privacidad y los Términos de Servicio — una sola fuente de verdad para
// no tener que actualizar el mismo dato en dos documentos.
//
// ⚠️ PENDIENTE antes de publicar en producción:
// - CONTACTO_HABEAS_DATA: confirmar con Silvana el correo real que va a
//   monitorear para solicitudes de habeas data (ejercer derechos ARCO). NO
//   es el mismo admin@softwart.com que usa el seed de desarrollo (ADMIN_EMAIL
//   en .env) — ese es solo un placeholder técnico para alertas internas del
//   sistema, no un correo pensado para que un cliente le escriba.
// - RESPONSABLE_DIRECCION: falta el número de local/oficina exacto ("#50-__").

/** Canal oficial habilitado por Arte Café para peticiones de habeas data. */
export const CONTACTO_HABEAS_DATA = 'CORREO POR DEFINIR'

/** Datos de contacto del responsable — exigidos por el art. 2.2.2.25.3.1 del Decreto 1074 de 2015. */
export const RESPONSABLE_DIRECCION = 'Carrera 74 #50-__, barrio Los Colores-Estadio, Medellín, Colombia'
export const RESPONSABLE_TELEFONO = '+57 300 5414130'

/** Días de retención de las copias de respaldo del proveedor de base de datos. Verificar contra el plan contratado en Supabase. */
export const DIAS_RETENCION_BACKUPS = 7
