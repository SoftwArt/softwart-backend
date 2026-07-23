import { version as APP_VERSION } from "../../package.json";

const spec = {
  openapi: "3.0.3",
  info: {
    title: "SoftwArt API",
    description: "REST API for Arte Café — a framing and marquetry shop in Medellín, Colombia. Consumed by the web admin panel and the Android companion app.",
    version: APP_VERSION,
    contact: { name: "Sergio E. León V." },
  },
  servers: [
    { url: "http://localhost:3001", description: "Local dev" },
    { url: "https://softwart.online", description: "Production" },
  ],
  tags: [
    { name: "Auth",         description: "Registration, login, password recovery" },
    { name: "Account",      description: "Client self-service portal" },
    { name: "Appointments", description: "Appointment scheduling (admin/employee)" },
    { name: "Sales",        description: "Sales and installment plans" },
    { name: "Clients",      description: "Client management" },
    { name: "Dashboard",    description: "Business KPIs" },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "JWT token obtained from POST /api/auth/login",
      },
    },
    schemas: {
      SuccessResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: true },
          message: { type: "string" },
          data:    { type: "object" },
        },
      },
      ErrorResponse: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string" },
        },
      },
      ValidationError: {
        type: "object",
        properties: {
          success: { type: "boolean", example: false },
          message: { type: "string", example: "correo: Invalid email" },
          errors:  { type: "array", items: { type: "string" } },
        },
      },
      LoginRequest: {
        type: "object",
        required: ["correo", "clave"],
        properties: {
          correo: { type: "string", format: "email", example: "admin@artecafe.co" },
          clave:  { type: "string", minLength: 6, example: "secret123" },
        },
      },
      RegisterRequest: {
        type: "object",
        required: ["tipoDocumento", "documento", "nombre", "correo", "clave"],
        properties: {
          tipoDocumento: { type: "string", example: "CC" },
          documento:     { type: "string", example: "1234567890" },
          nombre:        { type: "string", example: "María García" },
          correo:        { type: "string", format: "email", example: "maria@email.com" },
          clave:         { type: "string", minLength: 6, example: "secret123" },
          telefono:      { type: "string", example: "3001234567" },
        },
      },
      RecoverRequest: {
        type: "object",
        required: ["correo"],
        properties: {
          correo: { type: "string", format: "email", example: "user@email.com" },
        },
      },
      ResetPasswordRequest: {
        type: "object",
        required: ["token", "nueva_clave"],
        properties: {
          token:       { type: "string", example: "123456" },
          nueva_clave: { type: "string", minLength: 6, example: "newSecret123" },
        },
      },
      CreateAppointmentRequest: {
        type: "object",
        required: ["fecha", "hora"],
        properties: {
          fecha:          { type: "string", format: "date", example: "2025-09-15" },
          hora:           { type: "string", example: "14:00" },
          id_estado_cita: { type: "integer", example: 1 },
          id_cliente:     { type: "integer", example: 3 },
          observacion:    { type: "string", example: "Cliente trae el cuadro" },
        },
      },
      ServiceLine: {
        type: "object",
        required: ["id_servicio", "precio"],
        properties: {
          id_servicio:  { type: "integer", example: 1 },
          id_marco:     { type: "integer", nullable: true, example: 2 },
          precio:       { type: "number", example: 85000 },
          observacion:  { type: "string", example: "Marco dorado 40x60" },
        },
      },
      CreateSaleRequest: {
        type: "object",
        required: ["servicios"],
        properties: {
          servicios:   { type: "array", minItems: 1, items: { "$ref": "#/components/schemas/ServiceLine" } },
          observacion: { type: "string", example: "Cliente pagó anticipo en efectivo" },
        },
      },
      RegisterInstallmentRequest: {
        type: "object",
        required: ["monto", "id_metodo_pago"],
        properties: {
          monto:          { type: "number", example: 105000 },
          id_metodo_pago: { type: "integer", example: 1 },
          fecha:          { type: "string", format: "date", example: "2025-09-15" },
          tolerancia:     { type: "number", example: 1 },
        },
      },
      ConfigureInstallmentsRequest: {
        type: "object",
        properties: {
          num_abonos:              { type: "integer", minimum: 1, maximum: 12, example: 3 },
          porcentaje_primer_abono: { type: "integer", minimum: 1, maximum: 99, example: 50 },
        },
      },
    },
    responses: {
      Unauthorized: {
        description: "Missing or invalid JWT token",
        content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
      },
      Forbidden: {
        description: "Insufficient role/permissions",
        content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
      },
      NotFound: {
        description: "Resource not found",
        content: { "application/json": { schema: { "$ref": "#/components/schemas/ErrorResponse" } } },
      },
      ValidationError: {
        description: "Request body failed Zod validation",
        content: { "application/json": { schema: { "$ref": "#/components/schemas/ValidationError" } } },
      },
    },
  },

  paths: {
    // ── AUTH ─────────────────────────────────────────────────────────────────
    "/api/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/LoginRequest" } } } },
        responses: {
          200: {
            description: "Login successful — returns JWT token and user info",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                success: { type: "boolean", example: true },
                token:   { type: "string" },
                data: {
                  type: "object",
                  properties: {
                    id_usuario: { type: "integer" },
                    correo:     { type: "string" },
                    rol:        { type: "string", example: "Admin" },
                    id_cliente: { type: "integer", nullable: true },
                    nombre:     { type: "string", nullable: true },
                  },
                },
              },
            } } },
          },
          401: { description: "Invalid credentials" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register new client account (public landing page)",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RegisterRequest" } } } },
        responses: {
          201: { description: "Account created" },
          409: { description: "Email already in use" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/auth/recover": {
      post: {
        tags: ["Auth"],
        summary: "Request password recovery code via email",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RecoverRequest" } } } },
        responses: {
          200: { description: "Recovery email sent (generic response — does not reveal if email exists)" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/auth/reset-password": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using recovery code",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/ResetPasswordRequest" } } } },
        responses: {
          200: { description: "Password updated" },
          400: { description: "Invalid or expired token" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/auth/reenviar-codigo": {
      post: {
        tags: ["Auth"],
        summary: "Resend recovery code (idempotent — reuses valid token if still active)",
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RecoverRequest" } } } },
        responses: {
          200: { description: "Code sent (generic response)" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },

    // ── ACCOUNT (client portal) ───────────────────────────────────────────────
    "/api/account/perfil": {
      get: {
        tags: ["Account"],
        summary: "Get own profile",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Client profile" },
          401: { "$ref": "#/components/responses/Unauthorized" },
        },
      },
      put: {
        tags: ["Account"],
        summary: "Update profile — personal data OR password change (two branches)",
        description: "**Branch 1 — personal data:** send `nombre`, `telefono`, `correo` (all optional).\n\n**Branch 2 — password change:** send `clave_actual` + `clave`.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            properties: {
              nombre:       { type: "string", example: "María García" },
              telefono:     { type: "string", nullable: true, example: "3001234567" },
              correo:       { type: "string", format: "email", example: "maria@email.com" },
              clave_actual: { type: "string", example: "oldSecret" },
              clave:        { type: "string", minLength: 6, example: "newSecret123" },
            },
          } } },
        },
        responses: {
          200: { description: "Profile updated" },
          401: { "$ref": "#/components/responses/Unauthorized" },
          409: { description: "Email already in use" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/account/citas": {
      get: {
        tags: ["Account"],
        summary: "List own appointments",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Appointment list" },
          401: { "$ref": "#/components/responses/Unauthorized" },
        },
      },
      post: {
        tags: ["Account"],
        summary: "Book a new appointment (client-side)",
        description: "Valid hours: 13:00 – 18:00. Cannot book in the past.",
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            required: ["fecha", "hora"],
            properties: {
              fecha:       { type: "string", format: "date", example: "2025-09-15" },
              hora:        { type: "string", example: "14:00" },
              observacion: { type: "string", example: "Primera vez en el local" },
            },
          } } },
        },
        responses: {
          201: { description: "Appointment booked — confirmation email sent" },
          400: { description: "Past date or invalid time slot" },
          401: { "$ref": "#/components/responses/Unauthorized" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/account/citas/{id}/cancelar": {
      patch: {
        tags: ["Account"],
        summary: "Cancel own appointment (only if status is Pendiente)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Appointment cancelled" },
          400: { description: "Cannot cancel — appointment is not in Pendiente status" },
          403: { description: "Appointment does not belong to this client" },
          401: { "$ref": "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/account/availability": {
      get: {
        tags: ["Account"],
        summary: "Get booked slots for a date (no client info exposed)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "fecha", in: "query", required: true, schema: { type: "string", format: "date" }, example: "2025-09-15" }],
        responses: {
          200: {
            description: "Array of booked slots",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                data: { type: "array", items: {
                  type: "object",
                  properties: {
                    id_cita: { type: "integer" },
                    hora:    { type: "string", example: "14:00:00" },
                  },
                } },
              },
            } } },
          },
          401: { "$ref": "#/components/responses/Unauthorized" },
        },
      },
    },
    "/api/account": {
      delete: {
        tags: ["Account"],
        summary: "Delete own account — deactivates if has history, deletes permanently if clean",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "Account deleted or deactivated" },
          401: { "$ref": "#/components/responses/Unauthorized" },
        },
      },
    },

    // ── APPOINTMENTS (admin/employee) ─────────────────────────────────────────
    "/api/appointments": {
      get: {
        tags: ["Appointments"],
        summary: "List all appointments (paginated)",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page",  in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 500 } },
        ],
        responses: {
          200: { description: "Paginated appointment list with meta" },
          401: { "$ref": "#/components/responses/Unauthorized" },
          403: { "$ref": "#/components/responses/Forbidden" },
        },
      },
      post: {
        tags: ["Appointments"],
        summary: "Create appointment (admin/employee)",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/CreateAppointmentRequest" } } } },
        responses: {
          201: { description: "Appointment created" },
          401: { "$ref": "#/components/responses/Unauthorized" },
          403: { "$ref": "#/components/responses/Forbidden" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/appointments/{id}": {
      get: {
        tags: ["Appointments"],
        summary: "Get appointment by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Appointment detail" },
          404: { "$ref": "#/components/responses/NotFound" },
        },
      },
      put: {
        tags: ["Appointments"],
        summary: "Update appointment",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: {
            type: "object",
            properties: {
              fecha:          { type: "string", format: "date" },
              hora:           { type: "string", example: "15:00" },
              id_estado_cita: { type: "integer", example: 2 },
              id_cliente:     { type: "integer" },
            },
          } } },
        },
        responses: {
          200: { description: "Appointment updated" },
          404: { "$ref": "#/components/responses/NotFound" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
      delete: {
        tags: ["Appointments"],
        summary: "Delete appointment (blocked if it has an associated sale)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Appointment deleted" },
          409: { description: "Cannot delete — has associated sale" },
          404: { "$ref": "#/components/responses/NotFound" },
        },
      },
    },
    "/api/appointments/{id}/create-sale": {
      post: {
        tags: ["Appointments", "Sales"],
        summary: "Convert appointment into a sale (atomic transaction)",
        description: "Creates Sale + SaleDetail records and sets appointment status to Completada. Blocked if the appointment already has a sale.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/CreateSaleRequest" } } } },
        responses: {
          201: { description: "Sale created — returns id_venta and total" },
          400: { description: "Appointment has no associated client" },
          404: { description: "Appointment or service not found" },
          409: { description: "Appointment already has a sale" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },

    // ── SALES & INSTALLMENTS ─────────────────────────────────────────────────
    "/api/sales/{id}/payment-plan": {
      get: {
        tags: ["Sales"],
        summary: "Get installment plan and payment history for a sale",
        description: "Returns expected installments, payments made, current balance, and next installment due.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Full payment plan with history" },
          404: { "$ref": "#/components/responses/NotFound" },
        },
      },
    },
    "/api/sales/{id}/installment": {
      post: {
        tags: ["Sales"],
        summary: "Register next installment payment",
        description: "Amount must match the expected installment (± tolerance). Sale is automatically marked as paid when all installments are completed.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/RegisterInstallmentRequest" } } } },
        responses: {
          201: { description: "Installment registered" },
          400: { description: "Amount mismatch" },
          404: { description: "Sale or payment method not found" },
          409: { description: "All installments already completed" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },
    "/api/sales/{id}/configure-installments": {
      patch: {
        tags: ["Sales"],
        summary: "Configure installment plan (blocked if any payment already registered)",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        requestBody: { required: true, content: { "application/json": { schema: { "$ref": "#/components/schemas/ConfigureInstallmentsRequest" } } } },
        responses: {
          200: { description: "Configuration updated — returns new plan preview" },
          409: { description: "Cannot configure — payments already registered" },
          422: { "$ref": "#/components/responses/ValidationError" },
        },
      },
    },

    // ── DASHBOARD ─────────────────────────────────────────────────────────────
    "/api/dashboard": {
      get: {
        tags: ["Dashboard"],
        summary: "Business KPIs",
        description: "Returns: monthly sales total, today's appointments count, pending orders count, pending payments count.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: {
            description: "KPI summary",
            content: { "application/json": { schema: {
              type: "object",
              properties: {
                success: { type: "boolean" },
                data: {
                  type: "object",
                  properties: {
                    ventasMes:         { type: "number", example: 1250000 },
                    citasHoy:          { type: "integer", example: 3 },
                    serviciosPendientes: { type: "integer", example: 7 },
                    pagosPendientes:   { type: "integer", example: 2 },
                  },
                },
              },
            } } },
          },
          401: { "$ref": "#/components/responses/Unauthorized" },
        },
      },
    },

    // ── CLIENTS ───────────────────────────────────────────────────────────────
    "/api/clients": {
      get: {
        tags: ["Clients"],
        summary: "List all clients",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page",  in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 500 } },
        ],
        responses: {
          200: { description: "Paginated client list" },
          401: { "$ref": "#/components/responses/Unauthorized" },
          403: { "$ref": "#/components/responses/Forbidden" },
        },
      },
    },
    "/api/clients/{id}": {
      get: {
        tags: ["Clients"],
        summary: "Get client by ID",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }],
        responses: {
          200: { description: "Client detail" },
          404: { "$ref": "#/components/responses/NotFound" },
        },
      },
    },
  },
};

export default spec;
