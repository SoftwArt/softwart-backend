/**
 * Términos de Servicio — SoftwArt / Arte Café
 *
 * ESTADO: v1.0 — contenido cerrado con Silvana, lista para publicar.
 *
 * Marco normativo de referencia:
 *  - Ley 1480 de 2011 (Estatuto del Consumidor), en particular arts. 7, 8, 18, 42 y 43
 *  - Código Civil y Código de Comercio colombianos
 *  - Ley 1581 de 2012 (remisión a la política de tratamiento de datos)
 */

export const TERMINOS_SERVICIO_VERSION = '1.0';
export const TERMINOS_SERVICIO_FECHA = '7 de septiembre de 2026';

/** Reutilizados desde la política de privacidad para mantener una sola fuente. */
export const CONTACTO_ARTECAFE = 'silvanahd@gmail.com';
export const RESPONSABLE_TELEFONO_TOS = '3005414130';

/** Ventana mínima de cancelación de citas, en horas. Debe coincidir con el guard del backend. */
export const HORAS_MINIMAS_CANCELACION = 24;

export const TERMINOS_SERVICIO_SECCIONES = [
  {
    titulo: '1. Objeto y aceptación',
    parrafos: [
      'Estos Términos de Servicio regulan el uso de SoftwArt, la plataforma mediante la cual Arte Café ' +
      '—nombre comercial bajo el cual Silvana Salazar Contreras, persona natural, presta servicios de ' +
      'marquetería— gestiona sus citas, servicios y registros comerciales.',

      'Al crear una cuenta o usar el portal de clientes, aceptas estos términos. Si no estás de acuerdo ' +
      'con ellos, no debes usar la plataforma; puedes seguir contratando los servicios de Arte Café de ' +
      'forma presencial.',

      'La aceptación de estos términos es independiente de la autorización para el tratamiento de tus ' +
      'datos personales, que se rige por la Política de Tratamiento de Datos Personales y se solicita ' +
      'por separado.',
    ],
  },
  {
    titulo: '2. Qué es SoftwArt y qué no es',
    parrafos: [
      'SoftwArt es una herramienta de gestión y consulta. A través del portal de clientes puedes: ' +
      'agendar y cancelar citas, consultar el estado de los servicios contratados, y revisar tu ' +
      'historial de citas, servicios, ventas y pagos registrados por Arte Café.',

      'SoftwArt no es una tienda en línea. No es posible comprar servicios, contratar ni pagar a través ' +
      'de la plataforma. Toda contratación se perfecciona de forma presencial, en conversación directa ' +
      'con Arte Café, ya que cada trabajo de marquetería es personalizado y requiere valoración de la ' +
      'obra o el espacio.',

      'Los registros de ventas, pagos y abonos que ves en el portal son un reflejo documental de ' +
      'transacciones acordadas y realizadas por fuera de la plataforma. SoftwArt no procesa pagos, no ' +
      'almacena datos de tarjetas ni intermedia dinero de ninguna forma.',

      'Las comunicaciones que recibes son de dos clases, y conviene distinguirlas. Por un lado, el ' +
      'sistema envía automáticamente correos electrónicos informativos sobre el estado de tus citas y ' +
      'servicios. Por otro, Arte Café puede contactarte de forma directa y personal por teléfono o ' +
      'mensajería para coordinar detalles del trabajo; ese contacto lo realiza Arte Café, no la ' +
      'plataforma, y no está automatizado. El número telefónico que registras se usa para hacer posible ' +
      'ese contacto directo.',

      'Por lo anterior, el derecho de retracto previsto para las ventas a distancia no resulta aplicable ' +
      'a las contrataciones con Arte Café, sin perjuicio de los demás derechos que la ley te reconoce ' +
      'como consumidor.',
    ],
  },
  {
    titulo: '3. Cuentas de usuario',
    parrafos: [
      'Para usar el portal de clientes necesitas una cuenta. Puedes crearla tú desde el sitio web.',

      'Te comprometes a suministrar información veraz y a mantenerla actualizada. Los datos que ' +
      'registras se usan para identificarte, contactarte y asociar correctamente tus servicios y pagos.',

      'Eres responsable de mantener la confidencialidad de tu contraseña y de la actividad realizada ' +
      'desde tu cuenta. Si detectas un acceso no autorizado, avísanos de inmediato a los canales ' +
      'indicados en la sección 15.',

      'Las cuentas son personales e intransferibles y están dirigidas a personas mayores de dieciocho ' +
      '(18) años.',
    ],
  },
  {
    titulo: '4. Agendamiento y cancelación de citas',
    parrafos: [
      'Las citas son el punto de partida del servicio: es el momento en que se valora la obra o el ' +
      'espacio, se define el alcance del trabajo y se cotiza. Se atienden en el horario establecido por ' +
      'Arte Café para tal fin.',

      `Puedes cancelar una cita desde el portal hasta ${HORAS_MINIMAS_CANCELACION} horas antes de la ` +
      'hora programada. Dentro de ese margen, el sistema no permite la cancelación; si tienes un ' +
      'imprevisto, comunícate directamente con Arte Café.',

      'No existe una función de reprogramación como tal: para cambiar la fecha u hora, cancela la cita ' +
      'vigente —dentro del plazo permitido— y agenda una nueva. Arte Café también puede cancelar una ' +
      'cita cuando circunstancias operativas lo requieran, informándote por los medios de contacto ' +
      'registrados.',

      'Si no asistes a una cita sin haberla cancelado dentro del plazo permitido, el cupo se libera y ' +
      'queda disponible para otro cliente. Esto no genera ninguna sanción sobre tu cuenta, pero te ' +
      'pedimos cancelar con la anticipación indicada apenas sepas que no podrás asistir, para no ' +
      'restarle disponibilidad a otros clientes.',
    ],
  },
  {
    titulo: '5. Cotización y precios',
    parrafos: [
      'Cada trabajo se cotiza de forma individual durante la cita, en función de las características de ' +
      'la obra o el espacio, los materiales requeridos y el tipo de servicio (enmarcación, ' +
      'personalización, restauración, texturizado o decoración).',

      'El precio acordado en la cotización se mantiene durante toda la ejecución del servicio. Arte Café ' +
      'adquiere los materiales por pedido, específicamente para tu trabajo, por lo que la cotización ' +
      'contempla los costos desde el momento en que se acuerda.',

      'Si durante la ejecución se detecta una condición que no era visible al momento de cotizar —por ' +
      'ejemplo, un deterioro interno de la obra que solo se revela al iniciar una restauración— Arte ' +
      'Café suspende el trabajo en ese punto y te informa la situación antes de continuar. Cualquier ' +
      'cambio en el alcance o el costo requiere tu aprobación expresa y por escrito; sin ella, el ' +
      'trabajo no avanza más allá de lo ya cotizado.',
    ],
  },
  {
    titulo: '6. Prestación del servicio y plazos',
    parrafos: [
      'Una vez acordado el trabajo y realizado el abono inicial, Arte Café inicia la ejecución. Puedes ' +
      'consultar el avance en el portal, donde cada servicio registra su estado: sin empezar, en ' +
      'proceso, finalizado o cancelado.',

      'Los tiempos de entrega indicados son estimaciones, no plazos comprometidos. Cada trabajo de ' +
      'marquetería es distinto y personalizado, y factores como la disponibilidad de materiales o la ' +
      'complejidad real de la intervención pueden afectar la duración. Arte Café se compromete a ' +
      'informarte oportunamente si el trabajo tomará más de lo estimado.',

      'Si la demora es atribuible a Arte Café, te lo comunicaremos junto con la nueva fecha estimada de ' +
      'entrega. Esto no limita en modo alguno los derechos que la ley te reconoce como consumidor ante ' +
      'un incumplimiento en la prestación del servicio.',
    ],
  },
  {
    titulo: '7. Pagos y abonos',
    parrafos: [
      'El esquema habitual de pago es un abono del setenta por ciento (70%) para iniciar el trabajo y el ' +
      'treinta por ciento (30%) restante al finalizar. Estos porcentajes pueden ajustarse de común ' +
      'acuerdo en cada caso, según la naturaleza del trabajo.',

      'El saldo restante se paga en el momento del retiro de la obra, conforme al procedimiento descrito ' +
      'en la sección 9.',

      'Los medios de pago aceptados son: efectivo, transferencia bancaria y tarjeta a través de datáfono. ' +
      'Todos los pagos se realizan de forma presencial o por transferencia directa; como se indica en la ' +
      'sección 2, la plataforma no procesa pagos. Los registros de abonos y pagos que aparecen en el ' +
      'portal son constancias documentales de transacciones ya efectuadas.',

      'Los abonos no son reembolsables cuando el cliente desiste del trabajo una vez iniciado. La razón ' +
      'es concreta: Arte Café adquiere materiales por pedido y a la medida de cada encargo, y ejecuta ' +
      'trabajo específico que no puede destinarse a otro cliente. El abono cubre esos costos ya ' +
      'incurridos.',

      'Lo anterior no limita en modo alguno tus derechos como consumidor cuando el incumplimiento sea ' +
      'atribuible a Arte Café. Si el trabajo no se ejecuta, presenta defectos imputables al taller o la ' +
      'obra sufre daño bajo su custodia, se aplican la garantía legal y las responsabilidades previstas ' +
      'en la Ley 1480 de 2011, que son irrenunciables.',
    ],
  },
  {
    titulo: '8. Custodia de las obras entregadas',
    parrafos: [
      'Para prestar sus servicios, Arte Café recibe obras y objetos de tu propiedad y los conserva ' +
      'durante el tiempo que dure la intervención, aplicando el cuidado propio de su oficio.',

      'Arte Café no cuenta con una póliza de seguro que cubra las obras en custodia. Por eso, antes de ' +
      'iniciar cualquier procedimiento que implique un riesgo inherente para la obra o sus materiales ' +
      '—de manera especial en trabajos de restauración, donde puede presentarse un deterioro o daño ' +
      'irreparable ajeno a cualquier error del taller— te lo advertimos por escrito y te pedimos firmar ' +
      'una constancia de que recibiste esa advertencia.',

      'Esa constancia documenta que fuiste informado del riesgo propio del procedimiento antes de ' +
      'autorizarlo; no exonera a Arte Café de responsabilidad cuando el daño o la pérdida se deban a ' +
      'negligencia o error atribuible al taller, responsabilidad que sigue rigiéndose por las normas ' +
      'generales aplicables.',

      'En cada caso, Arte Café te presenta las alternativas disponibles para darle a tu obra el mejor ' +
      'manejo posible, de modo que puedas decidir con la información completa antes de autorizar el ' +
      'procedimiento.',
    ],
  },
  {
    titulo: '9. Entrega y obras no retiradas',
    parrafos: [
      'Cuando el trabajo finaliza, el sistema registra el cambio de estado y te envía un correo ' +
      'informativo. Adicionalmente, Arte Café se comunica contigo de forma directa para coordinar el ' +
      'retiro de la obra y el pago del saldo pendiente.',

      'Te pedimos retirar tu obra dentro del plazo indicado más abajo. El taller de Arte Café es un ' +
      'espacio de trabajo, no un depósito: no cuenta con condiciones para almacenar de forma prolongada ' +
      'un volumen alto de trabajos terminados a la vez, y una obra que permanece a la espera de ser ' +
      'retirada queda expuesta a un riesgo que aumenta con el tiempo. Retirarla oportunamente es la ' +
      'mejor forma de protegerla.',

      'El plazo para retirar tu obra es de un (1) mes desde que te notificamos la finalización del ' +
      'trabajo. Pasado ese plazo, Arte Café no responde por daños materiales ni por deterioro atribuible ' +
      'al paso del tiempo.',

      'Si la obra era tuya desde antes de contratar el servicio —por ejemplo, en restauración o ' +
      'texturizado—, sigue siendo de tu propiedad en todo momento y nunca se vende: Arte Café continúa ' +
      'resguardándola a la espera de que la retires, aunque sin garantizar ya sus condiciones de ' +
      'conservación.',

      'Si la obra fue fabricada por Arte Café desde cero —por ejemplo, un marco nuevo— y no la retiras ' +
      'dentro del mes, Arte Café puede ofrecerla en venta a otro cliente. Si regresas después de eso, te ' +
      'fabricamos una pieza nueva, con el mismo plazo mínimo de un (1) mes de elaboración.',

      'No se cobra bodegaje bajo ninguna circunstancia: Arte Café no dispone de un espacio de ' +
      'almacenamiento adecuado, y cobrar por la guarda reforzaría una obligación de custodia que no ' +
      'podría cumplir materialmente. Tampoco la obra pasa a ser propiedad de Arte Café por el simple ' +
      'transcurso del tiempo; lo que rige, en el caso de obras fabricadas desde cero, es la posibilidad ' +
      'de reventa descrita arriba, que aceptas al contratar el servicio en estos términos.',
    ],
  },
  {
    titulo: '10. Garantía',
    parrafos: [
      'Los servicios prestados por Arte Café cuentan con la garantía legal establecida en los artículos ' +
      '7 y 8 de la Ley 1480 de 2011, que es irrenunciable y opera con independencia de lo pactado.',

      'Además de la garantía legal, Arte Café ofrece una garantía comercial sobre defectos de ' +
      'manufacturación: doce (12) meses para obras fabricadas por Arte Café desde cero, y seis (6) meses ' +
      'para obras que traes para restauración, texturizado u otra intervención sobre un bien ' +
      'preexistente.',

      'Esta garantía cubre exclusivamente fallas atribuibles al proceso de manufactura —por ejemplo, el ' +
      'desprendimiento de un marco o un defecto de acabado—. No cubre el daño causado por manipulación ' +
      'indebida, humedad, golpes o exposición inadecuada por tu parte. Para hacerla efectiva, Arte Café ' +
      'revisa la pieza para confirmar que el defecto corresponde a un problema de manufactura antes de ' +
      'proceder con la corrección.',
    ],
  },
  {
    titulo: '11. Uso de imágenes de los trabajos',
    parrafos: [
      'Arte Café toma fotografías de algunos trabajos, en distintas etapas del proceso o del resultado ' +
      'final, y te las envía como registro; no mantiene redes sociales ni un portafolio público de forma ' +
      'habitual.',

      'Si en algún momento Arte Café desea usar alguna de esas fotografías con fines de difusión pública ' +
      '—por ejemplo, como portafolio o en redes sociales—, te solicitará una autorización expresa y ' +
      'específica para ese uso, independiente de la aceptación de estos términos. Puedes negarla ' +
      'libremente, sin que ello afecte en nada la prestación del servicio.',

      'Si la fotografía te identifica o se asocia a tu nombre, esa autorización se solicita en el marco ' +
      'de la Política de Tratamiento de Datos Personales, como una finalidad adicional a las allí ' +
      'declaradas.',
    ],
  },
  {
    titulo: '12. Uso aceptable de la plataforma',
    parrafos: [
      'Al usar SoftwArt te comprometes a no: suministrar información falsa o suplantar a otra persona; ' +
      'agendar citas sin intención real de asistir, de forma reiterada; intentar acceder a cuentas o ' +
      'información de otros clientes; interferir con el funcionamiento del sistema, sus medidas de ' +
      'seguridad o su disponibilidad; ni usar la plataforma para fines distintos de la gestión de tus ' +
      'propios servicios con Arte Café.',

      'Arte Café puede suspender o desactivar una cuenta que incurra en estas conductas, informando el ' +
      'motivo. La desactivación de la cuenta no afecta los servicios en curso ni las obligaciones ' +
      'económicas pendientes entre las partes.',
    ],
  },
  {
    titulo: '13. Disponibilidad del servicio',
    parrafos: [
      'Arte Café procura mantener SoftwArt disponible y funcionando correctamente, pero no garantiza su ' +
      'operación ininterrumpida ni libre de errores. La plataforma puede presentar interrupciones por ' +
      'mantenimiento, actualizaciones o fallas de los proveedores tecnológicos de los que depende.',

      'Una interrupción del portal no afecta los acuerdos comerciales vigentes entre tú y Arte Café: los ' +
      'trabajos en curso, los pagos acordados y las citas programadas conservan plena validez y pueden ' +
      'gestionarse por los canales de contacto directo indicados en la sección 15.',
    ],
  },
  {
    titulo: '14. Propiedad intelectual',
    parrafos: [
      'SoftwArt —su código, diseño, estructura y elementos gráficos— es propiedad de su desarrollador y ' +
      'se encuentra licenciado a Arte Café para la operación de su negocio. El acceso al portal no te ' +
      'concede derecho alguno sobre el software.',

      'Las obras que entregas para su intervención siguen siendo de tu propiedad en todo momento. La ' +
      'prestación del servicio no transfiere a Arte Café ningún derecho sobre ellas.',
    ],
  },
  {
    titulo: '15. Protección de datos personales y contacto',
    parrafos: [
      'El tratamiento de tus datos personales se rige por la Política de Tratamiento de Datos ' +
      'Personales, documento independiente que aceptas por separado y que puedes consultar en cualquier ' +
      'momento desde el portal.',

      `Para cualquier consulta relacionada con estos términos o con los servicios de Arte Café, puedes ` +
      `escribir a ${CONTACTO_ARTECAFE} o comunicarte al ${RESPONSABLE_TELEFONO_TOS}.`,
    ],
  },
  {
    titulo: '16. Modificaciones a estos términos',
    parrafos: [
      `Esta es la versión ${TERMINOS_SERVICIO_VERSION} de estos Términos de Servicio, vigente desde el ` +
      `${TERMINOS_SERVICIO_FECHA}.`,

      'Arte Café puede modificarlos para reflejar cambios en su operación o en la normativa aplicable. ' +
      'Cuando la modificación sea sustancial, te pediremos aceptar la nueva versión la próxima vez que ' +
      'inicies sesión o realices una acción que lo requiera. Los cambios no aplican de forma retroactiva ' +
      'a los trabajos ya acordados, que se rigen por los términos vigentes al momento de su contratación.',
    ],
  },
  {
    titulo: '17. Ley aplicable y jurisdicción',
    parrafos: [
      'Estos términos se rigen por la legislación colombiana. Cualquier controversia derivada de ellos o ' +
      'de la prestación de los servicios se someterá a los jueces y tribunales competentes de la ciudad ' +
      'de Medellín, Colombia.',

      'Como consumidor, conservas la facultad de acudir a la Superintendencia de Industria y Comercio en ' +
      'ejercicio de los derechos que te reconoce el Estatuto del Consumidor.',
    ],
  },
];

/**
 * Checklist de pendientes. Vacío: los 8 puntos se resolvieron con Silvana
 * antes de publicar la v1.0 (ver historial de git para el detalle de cada
 * decisión).
 */
export const PENDIENTES_TOS: { seccion: number; tema: string; prioridad: string }[] = [];
