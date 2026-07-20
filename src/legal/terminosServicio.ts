/**
 * Términos de Servicio — SoftwArt / Arte Café
 *
 * ESTADO: BORRADOR. NO PUBLICAR.
 *
 * Este documento contiene marcadores [[PENDIENTE]] correspondientes a decisiones
 * de negocio que deben consultarse con Silvana antes de su publicación. El listado
 * completo está en PENDIENTES_TOS al final del archivo.
 *
 * Al resolver todos los pendientes:
 *   1. Reemplazar el texto de cada marcador.
 *   2. Cambiar TERMINOS_SERVICIO_VERSION a '1.0'.
 *   3. Fijar TERMINOS_SERVICIO_FECHA.
 *   4. Recalcular el hash canónico (ADR-007, regla 6).
 *
 * Marco normativo de referencia:
 *  - Ley 1480 de 2011 (Estatuto del Consumidor), en particular arts. 7, 8, 18, 42 y 43
 *  - Código Civil y Código de Comercio colombianos
 *  - Ley 1581 de 2012 (remisión a la política de tratamiento de datos)
 */

export const TERMINOS_SERVICIO_VERSION = '1.0-BORRADOR';
export const TERMINOS_SERVICIO_FECHA = '__DD_DE_MES_DE_AAAA__';

/** Reutilizados desde la política de privacidad para mantener una sola fuente. */
export const CONTACTO_ARTECAFE = '__CORREO_DEFINIDO_POR_SILVANA__';
export const RESPONSABLE_TELEFONO_TOS = '__TELEFONO_DE_CONTACTO__';

/** Ventana mínima de cancelación de citas, en horas. Debe coincidir con el guard del backend. */
export const HORAS_MINIMAS_CANCELACION = 6;

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
      'Para usar el portal de clientes necesitas una cuenta. Puedes crearla tú desde el sitio web, o ' +
      'Arte Café puede crearla a tu nombre cuando te atiende presencialmente; en ese caso recibirás un ' +
      'correo de invitación para definir tu contraseña, válido por veinticuatro (24) horas. Si vence, ' +
      'puedes solicitar una nueva invitación o usar la opción de recuperación de contraseña.',

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

      '[[PENDIENTE: inasistencia. Definir si existe tolerancia de espera y de cuánto tiempo; qué ocurre ' +
      'con el cupo si el cliente no se presenta; si la inasistencia reiterada tiene alguna consecuencia. ' +
      'La propuesta técnica es que el cupo se libere y quede disponible para otro cliente, con una ' +
      'tolerancia equivalente al espacio entre citas.]]',
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

      '[[PENDIENTE: imprevistos. Definir qué ocurre si durante la ejecución se detecta una condición no ' +
      'visible al momento de cotizar —por ejemplo, deterioro interno de una obra en restauración— que ' +
      'modifique el alcance o el costo. Alternativas: suspender e informar antes de continuar; margen ' +
      'de variación tolerado sin nueva aprobación; requerir aprobación escrita para cualquier cambio.]]',
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

      '[[PENDIENTE: demoras. Definir qué ocurre ante una demora significativa atribuible al taller. ' +
      'Alternativas: aviso con nueva fecha estimada; posibilidad de que el cliente desista con ' +
      'devolución del abono no ejecutado; compensación. Tener presente que una demora imputable a Arte ' +
      'Café no puede quedar sin consecuencia alguna para el prestador.]]',
    ],
  },
  {
    titulo: '7. Pagos y abonos',
    parrafos: [
      'El esquema habitual de pago es un abono del setenta por ciento (70%) para iniciar el trabajo y el ' +
      'treinta por ciento (30%) restante al finalizar. Estos porcentajes pueden ajustarse de común ' +
      'acuerdo en cada caso, según la naturaleza del trabajo.',

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

      '[[PENDIENTE: plazo de pago del saldo. Definir cuánto tiempo tiene el cliente para pagar el 30% ' +
      'restante una vez notificada la finalización del trabajo, y si ese plazo se relaciona con el de ' +
      'retiro de la obra (sección 9).]]',
    ],
  },
  {
    titulo: '8. Custodia de las obras entregadas',
    parrafos: [
      'Para prestar sus servicios, Arte Café recibe obras y objetos de tu propiedad y los conserva ' +
      'durante el tiempo que dure la intervención, aplicando el cuidado propio de su oficio.',

      '[[PENDIENTE — SECCIÓN COMPLETA. Es el bloque de mayor exposición del documento y requiere ' +
      'definición cuidadosa. Preguntas a resolver: ¿Arte Café cuenta con seguro sobre las obras en ' +
      'custodia? ¿Se solicita al cliente declarar el valor de obras de alto valor antes de recibirlas? ' +
      '¿Se deja constancia escrita o fotográfica del estado en que se recibe la obra? ¿Qué límite de ' +
      'responsabilidad se declara ante daño o pérdida? En restauración específicamente: ¿se advierte por ' +
      'escrito, antes de iniciar, que el procedimiento conlleva riesgos inherentes y que el resultado ' +
      'no siempre es enteramente predecible?',
      'ADVERTENCIA NORMATIVA: una exoneración total de responsabilidad por daño o pérdida constituiría ' +
      'una cláusula abusiva bajo los arts. 42 y 43 de la Ley 1480 de 2011 y sería ineficaz de pleno ' +
      'derecho. La redacción viable es un límite razonable acompañado de un procedimiento de constancia ' +
      'del estado de la obra, no una exclusión de responsabilidad. Se recomienda revisión por abogado ' +
      'para esta sección.]]',
    ],
  },
  {
    titulo: '9. Entrega y obras no retiradas',
    parrafos: [
      'Cuando el trabajo finaliza, el sistema registra el cambio de estado y te envía un correo ' +
      'informativo. Adicionalmente, Arte Café se comunica contigo de forma directa para coordinar el ' +
      'retiro de la obra y el pago del saldo pendiente.',

      'Te pedimos retirar tu obra dentro del plazo indicado más abajo. El taller de Arte Café es un ' +
      'espacio de trabajo, no un depósito: no cuenta con condiciones de almacenamiento prolongado, y ' +
      'una obra terminada que permanece a la espera de ser retirada queda expuesta a un riesgo que ' +
      'aumenta con el tiempo. Retirarla oportunamente es la mejor forma de protegerla.',

      '[[PENDIENTE — SECCIÓN COMPLETA. Preguntas a resolver: ¿Durante cuánto tiempo puede conservarse ' +
      'realmente una obra terminada, considerando el espacio físico disponible? ¿Cuántos avisos se ' +
      'envían antes de considerarla no reclamada, y por qué medios? ¿Qué procedimiento se sigue después ' +
      'de ese punto?',
      'NOTA DE ALCANCE: se descarta el cobro de bodegaje. Arte Café no dispone de un espacio de ' +
      'almacenamiento adecuado, y cobrar por la guarda reforzaría una obligación de custodia que no ' +
      'puede cumplirse materialmente, agravando la exposición en lugar de reducirla. La vía correcta es ' +
      'un plazo corto, avisado con claridad, más la declaración expresa de que las condiciones de ' +
      'conservación son limitadas.',
      'ADVERTENCIA NORMATIVA: no es válido estipular que, transcurrido cierto plazo, la obra pasa a ser ' +
      'propiedad de Arte Café. La propiedad no se transfiere por una cláusula unilateral. Lo que sí puede ' +
      'establecerse es un procedimiento documentado de avisos y constancia. El art. 18 de la Ley 1480 de ' +
      '2011 regula específicamente los bienes entregados para la prestación de un servicio y debe ' +
      'consultarse íntegramente antes de redactar esta sección.]]',
    ],
  },
  {
    titulo: '10. Garantía',
    parrafos: [
      'Los servicios prestados por Arte Café cuentan con la garantía legal establecida en los artículos ' +
      '7 y 8 de la Ley 1480 de 2011, que es irrenunciable y opera con independencia de lo pactado.',

      '[[PENDIENTE: alcance de la garantía comercial. Preguntas a resolver: ¿Arte Café ofrece una ' +
      'garantía adicional a la legal y por cuánto tiempo? ¿Qué cubre exactamente —por ejemplo, ' +
      'desprendimiento de un marco, defectos de acabado— y qué queda excluido —daño por manipulación ' +
      'del cliente, humedad, golpes, exposición inadecuada—? ¿Cuál es el procedimiento para hacerla ' +
      'efectiva?]]',
    ],
  },
  {
    titulo: '11. Uso de imágenes de los trabajos',
    parrafos: [
      '[[PENDIENTE — SECCIÓN COMPLETA. Contexto conocido: Arte Café no mantiene redes sociales y las ' +
      'fotografías que se toman se envían directamente al cliente como registro del avance o del ' +
      'resultado. Preguntas a resolver: ¿existe interés en usar fotografías de los trabajos como ' +
      'portafolio, hoy o a futuro? Si es así, debe incorporarse una autorización específica, separada y ' +
      'opcional, que el cliente pueda negar sin que ello afecte la prestación del servicio.',
      'Si la fotografía permite identificar al cliente o se asocia a su nombre, la autorización cruza ' +
      'además con la Política de Tratamiento de Datos Personales y constituye una finalidad distinta a ' +
      'las allí declaradas. Si se decide no usar imágenes con fines de difusión, basta declararlo ' +
      'expresamente y esta sección se resuelve en un párrafo.]]',
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
 * Checklist de pendientes. Debe quedar vacío antes de publicar la v1.0.
 * Ordenado por prioridad: los tres primeros son los de mayor exposición.
 */
export const PENDIENTES_TOS = [
  { seccion: 8,  tema: 'Custodia de obras: seguro, declaración de valor, constancia de estado, límite de responsabilidad, advertencia de riesgo en restauración', prioridad: 'ALTA' },
  { seccion: 9,  tema: 'Obras no retiradas: plazo realista según espacio disponible, avisos (automáticos vs. directos), procedimiento posterior. Bodegaje descartado.', prioridad: 'ALTA' },
  { seccion: 10, tema: 'Garantía comercial: duración, cobertura, exclusiones, procedimiento', prioridad: 'ALTA' },
  { seccion: 6,  tema: 'Demoras atribuibles al taller: consecuencias', prioridad: 'MEDIA' },
  { seccion: 7,  tema: 'Plazo para el pago del saldo tras la finalización', prioridad: 'MEDIA' },
  { seccion: 5,  tema: 'Imprevistos durante la ejecución: re-cotización o margen tolerado', prioridad: 'MEDIA' },
  { seccion: 4,  tema: 'Inasistencia a citas: tolerancia y liberación del cupo', prioridad: 'BAJA' },
  { seccion: 11, tema: 'Uso de imágenes de los trabajos: definir si aplica', prioridad: 'BAJA' },
];