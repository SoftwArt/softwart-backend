// src/legal/politicaPrivacidad.ts
//
// Política de Tratamiento de Datos Personales — Arte Café / SoftwArt
// Elaborada con base en la Ley 1581 de 2012 (Régimen General de Protección
// de Datos Personales) y el Decreto 1377 de 2013, República de Colombia.
//
// Fuente única del contenido — el frontend NO tiene copia propia, lo consume
// vía GET /api/legal/politica-privacidad (LegalController.ts). El hash usado
// en aceptacion_legal.hash_documento se calcula sobre POLITICA_PRIVACIDAD_SECCIONES
// al arrancar el servidor (ver helpers/legalHash.helper.ts) — cualquier
// cambio de contenido aquí cambia el hash resultante.
import {
  CONTACTO_HABEAS_DATA,
  RESPONSABLE_DIRECCION,
  RESPONSABLE_TELEFONO,
  DIAS_RETENCION_BACKUPS,
} from './legalConfig'

export const POLITICA_PRIVACIDAD_VERSION = 'v1.0'
export const POLITICA_PRIVACIDAD_FECHA = '__19_DE_JULIO_DE_2026__'

export const POLITICA_PRIVACIDAD_SECCIONES = [
  {
    titulo: '1. Responsable del tratamiento',
    parrafos: [
      'Arte Café es el nombre comercial bajo el cual Silvana Salazar Contreras, persona natural, ' +
      'presta sus servicios de marquetería (enmarcación, restauración, personalización y decoración) ' +
      `desde su establecimiento ubicado en ${RESPONSABLE_DIRECCION}.`,

      'Para efectos de esta política, "Arte Café", "nosotros" o "el Responsable" se refieren a Silvana ' +
      'Salazar Contreras en su calidad de responsable del tratamiento de los datos personales recolectados ' +
      'a través del sistema SoftwArt (panel administrativo, portal de clientes y aplicación móvil).',

      `Canales de contacto: correo electrónico ${CONTACTO_HABEAS_DATA} y teléfono ${RESPONSABLE_TELEFONO}. ` +
      'El área administrativa de Arte Café es la designada para atender las consultas y reclamos ' +
      'relacionados con el tratamiento de datos personales.',
    ],
  },
  {
    titulo: '2. Definiciones',
    parrafos: [
      'Para facilitar la lectura de esta política, usamos los términos definidos en el artículo 3 de la ' +
      'Ley 1581 de 2012:',

      '• Titular: la persona natural a quien se refieren los datos personales. Si tienes una cuenta en ' +
      'SoftwArt, eres el titular de tus datos.',
      '• Tratamiento: cualquier operación sobre datos personales, como recolectarlos, almacenarlos, ' +
      'usarlos, circularlos o suprimirlos.',
      '• Responsable del tratamiento: quien decide sobre la base de datos y las finalidades del ' +
      'tratamiento. En este caso, Arte Café.',
      '• Encargado del tratamiento: quien trata datos personales por cuenta del Responsable y siguiendo ' +
      'sus instrucciones. En este caso, nuestros proveedores tecnológicos.',
      '• Autorización: tu consentimiento previo, expreso e informado para que tratemos tus datos.',
    ],
  },
  {
    titulo: '3. Datos personales que recolectamos',
    parrafos: [
      'Recolectamos únicamente los datos necesarios para prestar el servicio y gestionar la relación ' +
      'comercial: nombre completo, tipo y número de documento de identidad, correo electrónico, número ' +
      'de teléfono, y el historial de citas, servicios, ventas y pagos asociado a tu cuenta.',

      'Adicionalmente, y de forma automática, nuestros servidores registran datos técnicos de conexión ' +
      '(dirección IP, tipo de navegador o dispositivo, y fecha y hora de acceso). Estos datos se usan ' +
      'exclusivamente para garantizar la seguridad del sistema, auditar accesos y diagnosticar fallas; ' +
      'no se emplean para elaborar perfiles ni con fines publicitarios.',

      'En el caso del personal de Arte Café que usa la aplicación móvil, almacenamos además un ' +
      'identificador técnico del dispositivo (token de notificaciones push) con el único fin de entregar ' +
      'avisos operativos internos.',

      'No recolectamos datos sensibles (salud, orientación sexual, creencias religiosas o políticas, ' +
      'datos biométricos, entre otros) definidos en el artículo 5 de la Ley 1581 de 2012, ni datos de ' +
      'menores de edad.',
    ],
  },
  {
    titulo: '4. Finalidades del tratamiento',
    parrafos: [
      'Tus datos personales se usan exclusivamente para: (a) agendar, confirmar y gestionar citas; ' +
      '(b) registrar y dar seguimiento a ventas, servicios y pagos; (c) enviarte notificaciones sobre ' +
      'el estado de tus citas, pedidos y pagos por correo electrónico; (d) permitirte acceder y hacer ' +
      'seguimiento a tu historial a través del portal de clientes; (e) garantizar la seguridad y ' +
      'trazabilidad de las operaciones realizadas en el sistema; y (f) cumplir con obligaciones ' +
      'legales, contables y tributarias.',

      'No usamos tus datos para fines publicitarios de terceros, ni los vendemos, arrendamos o cedemos ' +
      'a cambio de una contraprestación económica.',

      'El sistema no toma decisiones automatizadas que produzcan efectos jurídicos sobre ti ni que te ' +
      'afecten de manera significativa. Toda decisión comercial relevante es tomada por el personal de ' +
      'Arte Café.',
    ],
  },
  {
    titulo: '5. Autorización y prueba del consentimiento',
    parrafos: [
      'El tratamiento de tus datos se sustenta en la autorización previa, expresa e informada que otorgas ' +
      'al aceptar esta política dentro del sistema. La aceptación de esta política y la de los Términos de ' +
      'Servicio son actos independientes: se solicitan y se registran por separado, porque tienen efectos ' +
      'distintos.',

      'La autorización es un acto voluntario. Sin ella no es posible crear una cuenta ni agendar citas a ' +
      'través del portal, ya que tus datos son indispensables para prestar el servicio.',

      'Como constancia de esa autorización, y en cumplimiento del artículo 17 de la Ley 1581 de 2012, ' +
      'registramos: la fecha y hora exactas de tu aceptación, la versión del documento aceptado, una huella ' +
      'digital (hash) que identifica de forma inequívoca el texto que se te mostró, y los datos técnicos de ' +
      'la conexión desde la que aceptaste (dirección IP y navegador o dispositivo). Estos últimos se ' +
      'conservan únicamente como respaldo probatorio de la autorización y no se usan para ningún otro fin.',

      'Este registro es inalterable: cada aceptación, actualización o revocación queda guardada como un ' +
      'evento independiente, sin sobrescribir los anteriores. Puedes solicitar copia de tu historial de ' +
      'autorizaciones en cualquier momento a través de los canales indicados en la sección 1.',
    ],
  },
  {
  titulo: '5A. Revocación de la autorización',
  parrafos: [
    'Puedes revocar en cualquier momento la autorización que otorgaste para el tratamiento de tus datos, ' +
    'escribiendo a los canales indicados en la sección 1. La revocación no requiere justificación y es ' +
    'gratuita.',

    'Debes tener en cuenta dos efectos. Primero: como tus datos son indispensables para agendar citas, ' +
    'registrar ventas y darte acceso al portal, la revocación implica el cierre de tu cuenta; no es ' +
    'posible seguir prestándote el servicio sin tratar tus datos. Segundo: la revocación detiene el ' +
    'tratamiento hacia el futuro, pero no elimina el historial de ventas, servicios y pagos que la ley ' +
    'comercial y tributaria nos obliga a conservar, según lo explicado en la sección 9.',

    'La aceptación de los Términos de Servicio no es revocable por esta vía, ya que corresponde a un ' +
    'acuerdo contractual y no a una autorización de tratamiento de datos.',
  ],
},
  {
    titulo: '6. Encargados del tratamiento y transmisión internacional de datos',
    parrafos: [
      'Para operar el sistema nos apoyamos en proveedores tecnológicos externos que actúan como ' +
      'encargados del tratamiento: tratan tus datos por cuenta de Arte Café, siguiendo nuestras ' +
      'instrucciones y sin poder usarlos para finalidades propias. Como sus servidores están ubicados ' +
      'fuera de Colombia (principalmente en Estados Unidos), esta relación constituye una transmisión ' +
      'internacional de datos personales en los términos del Decreto 1074 de 2015:',

      '• Supabase (base de datos) — almacena la información de clientes, citas, ventas y pagos.',
      '• Render — aloja el servidor backend que procesa las solicitudes del sistema.',
      '• Vercel — aloja el panel administrativo y el portal de clientes.',
      '• Resend — envía las notificaciones y correos transaccionales (confirmación de citas, ' +
      'recuperación de contraseña).',
      '• Cloudinary — almacena las imágenes asociadas a marcos y servicios.',
      '• Firebase Cloud Messaging (Google) — envía notificaciones push a la aplicación móvil del ' +
      'personal de Arte Café cuando se agenda una cita nueva; no se usa para notificar clientes.',

      'Estos proveedores operan bajo términos contractuales que les imponen deberes de seguridad, ' +
      'confidencialidad y uso limitado de la información, acordes con la normativa aplicable. Arte Café ' +
      'conserva en todo momento la condición de responsable del tratamiento y sigue siendo tu ' +
      'interlocutor para el ejercicio de cualquiera de tus derechos.',

      'No transferimos tus datos personales a terceros que los traten como responsables para sus propias ' +
      'finalidades.',
    ],
  },
  {
    titulo: '7. Tus derechos como titular de los datos',
    parrafos: [
      'De acuerdo con el artículo 8 de la Ley 1581 de 2012, tienes derecho a: conocer, actualizar y ' +
      'rectificar tus datos personales; solicitar prueba de la autorización otorgada; ser informado ' +
      'sobre el uso que se les ha dado; presentar quejas ante la Superintendencia de Industria y ' +
      'Comercio; revocar la autorización y/o solicitar la supresión del dato cuando no exista un deber ' +
      'legal o contractual que impida su eliminación; y acceder gratuitamente a tus datos.',

      'Estos derechos los ejerces tú directamente, o quien te represente legalmente, o un tercero ' +
      'debidamente autorizado por ti. El ejercicio de estos derechos es gratuito.',
    ],
  },
  {
    titulo: '8. Procedimiento para consultas y reclamos',
    parrafos: [
      `Puedes dirigir tus solicitudes al correo ${CONTACTO_HABEAS_DATA}, indicando en el asunto ` +
      '"Protección de datos personales".',

      'Consultas (artículo 14 de la Ley 1581 de 2012): son las solicitudes para conocer la información ' +
      'que tenemos sobre ti. Basta con que nos envíes tu nombre completo, número de documento y una ' +
      'descripción de lo que deseas consultar. Responderemos dentro de los diez (10) días hábiles ' +
      'siguientes a la recepción. Si no fuera posible atenderla en ese plazo, te informaremos los ' +
      'motivos y la fecha de respuesta, que en ningún caso superará los cinco (5) días hábiles ' +
      'siguientes al vencimiento del primer término.',

      'Reclamos (artículo 15 de la Ley 1581 de 2012): son las solicitudes de corrección, actualización o ' +
      'supresión de datos, o para denunciar un presunto incumplimiento de la ley. Deben contener tu ' +
      'identificación, la descripción de los hechos que dan lugar al reclamo, la dirección o canal donde ' +
      'deseas recibir la respuesta, y los documentos que quieras aportar. Si el reclamo está incompleto, ' +
      'te pediremos subsanarlo dentro de los cinco (5) días siguientes; si transcurridos dos (2) meses no ' +
      'recibimos respuesta, entenderemos que has desistido. El término máximo de respuesta es de quince ' +
      '(15) días hábiles contados desde el día siguiente a la recepción, prorrogable hasta por ocho (8) ' +
      'días hábiles más, lo cual te informaremos con los motivos correspondientes.',

      'Si consideras que no atendimos adecuadamente tu solicitud, puedes presentar una queja ante la ' +
      'Superintendencia de Industria y Comercio. La ley exige haber agotado previamente el trámite de ' +
      'consulta o reclamo ante nosotros.',
    ],
  },
  {
    titulo: '9. Conservación y eliminación de tus datos',
    parrafos: [
      'Puedes solicitar la eliminación de tu cuenta y tus datos personales en cualquier momento. Si no ' +
      'tienes ningún historial en el sistema (sin citas, ventas ni servicios asociados), tus datos se ' +
      'eliminan de la base de datos activa de forma definitiva.',

      'Si tu cuenta tiene historial de citas, ventas, servicios o pagos, no podemos eliminar esos ' +
      'registros: el artículo 28 de la Ley 962 de 2005 y el artículo 60 del Código de Comercio obligan a ' +
      'conservar los libros y papeles de comercio por diez (10) años, y el artículo 632 del Estatuto ' +
      'Tributario impone la conservación de los soportes fiscales. En ese caso, tu cuenta se desactiva ' +
      '(deja de estar disponible para iniciar sesión y no aparece como cliente activo), pero el historial ' +
      'transaccional se conserva únicamente con fines de trazabilidad y cumplimiento legal, sin que pueda ' +
      'usarse para ningún otro propósito.',

      'Ten en cuenta que la eliminación es inmediata sobre la base de datos activa, pero nuestras copias ' +
      `de respaldo cifradas pueden conservar el registro hasta por ${DIAS_RETENCION_BACKUPS} días ` +
      'adicionales, tras los cuales se sobrescriben automáticamente. Estas copias solo se usan para ' +
      'restaurar el servicio ante una falla, nunca para consultar información.',

      'Aun después de suprimir tus datos, conservamos la constancia de la autorización que otorgaste, ' +
    'porque la ley nos obliga a poder demostrar que el tratamiento fue autorizado. Esa constancia incluye ' +
    'tu número de documento y tu correo electrónico tal como estaban al momento de la aceptación, junto ' +
    'con la fecha, la versión aceptada, la huella digital del documento y los datos técnicos de la ' +
    'conexión. Es la mínima información que permite acreditar quién autorizó qué y cuándo.',

    'Esta constancia se conserva por diez (10) años contados desde el último evento registrado, plazo ' +
    'coherente con el de conservación de los papeles de comercio, y se usa exclusivamente para atender ' +
    'requerimientos de autoridades o para acreditar el cumplimiento de la normativa de protección de ' +
    'datos. No se emplea para contactarte ni para ninguna finalidad comercial.',
    ],
  },
  {
    titulo: '10. Seguridad de la información',
    parrafos: [
      'Aplicamos medidas técnicas razonables para proteger tus datos: las contraseñas se almacenan ' +
      'cifradas mediante funciones de hash de un solo sentido (nunca en texto plano), las comunicaciones ' +
      'viajan cifradas (HTTPS), y el acceso al panel administrativo está restringido por roles y ' +
      'permisos — solo el personal autorizado puede consultar tu información, y únicamente lo necesario ' +
      'para su rol.',

      'Ninguna medida de seguridad es infalible. Si llegara a presentarse una violación a los códigos de ' +
      'seguridad que comprometa tus datos personales, informaremos a la Superintendencia de Industria y ' +
      'Comercio conforme al artículo 17 de la Ley 1581 de 2012, y te notificaremos por los canales de ' +
      'contacto registrados en tu cuenta.',
    ],
  },
  {
    titulo: '11. Datos de menores de edad',
    parrafos: [
      'El sistema SoftwArt está dirigido exclusivamente a personas mayores de dieciocho (18) años. No ' +
      'recolectamos de forma consciente datos personales de menores de edad.',

      'Si detectamos que una cuenta fue creada por un menor de edad, procederemos a desactivarla y a ' +
      'suprimir sus datos, salvo que exista una obligación legal de conservación. Si eres madre, padre o ' +
      'representante legal de un menor cuyos datos crees que fueron registrados, escríbenos a los canales ' +
      'indicados en la sección 1.',
    ],
  },
  {
    titulo: '12. Registro Nacional de Bases de Datos (RNBD)',
    parrafos: [
      'De acuerdo con el Decreto 090 de 2018, la obligación de inscribir las bases de datos en el RNBD ' +
      'ante la Superintendencia de Industria y Comercio aplica únicamente a las sociedades y entidades ' +
      'sin ánimo de lucro con activos totales superiores a 100.000 UVT y a las personas jurídicas de ' +
      'naturaleza pública; las personas naturales fueron expresamente excluidas. Arte Café opera como ' +
      'persona natural, por lo que no está obligada a realizar dicha inscripción.',

      'Esta exclusión no nos releva del cumplimiento de los demás deberes previstos en la Ley 1581 de ' +
      '2012, los cuales atendemos íntegramente conforme a lo descrito en esta política.',
    ],
  },
  {
    titulo: '13. Vigencia y cambios a esta política',
    parrafos: [
      `Esta es la versión ${POLITICA_PRIVACIDAD_VERSION} de esta política, vigente desde el ${POLITICA_PRIVACIDAD_FECHA}. ` +
      'Permanecerá vigente mientras Arte Café desarrolle su actividad comercial, y las bases de datos ' +
      'asociadas se mantendrán durante el tiempo necesario para cumplir las finalidades descritas en la ' +
      'sección 4 y los plazos legales de conservación señalados en la sección 9.',

      'Si la actualizamos de forma sustancial, te pediremos aceptarla nuevamente la próxima vez que ' +
      'inicies sesión o realices una acción que la requiera. Los cambios menores (correcciones de ' +
      'redacción o actualización de datos de contacto) se publicarán en esta misma página con una nueva ' +
      'fecha de vigencia.',
    ],
  },
]
