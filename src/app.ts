import dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";
import express, { Application, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";

import pinoHttp from "pino-http";

import { registerRoutes } from "./routes";
import helmet from "helmet";
import { corsMiddleware, notFoundMiddleware, generalLimiter } from "./middlewares";
import { HandlerError } from "./errors";
import { logger } from "./config/logger";
import swaggerSpec from "./docs/swagger";
import { version as APP_VERSION } from "../package.json";

const app: Application = express();

app.set("trust proxy", 1);
app.use(helmet());
// A05 (OWASP) — límite de payload: ningún body legítimo del proyecto pasa de unos
// KB, así que un tope de 100kb rechaza payloads gigantes (413) antes de que ocupen
// RAM. Mitiga DoS de una sola fuente (no DDoS — eso es a nivel de infraestructura).
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: true, limit: "100kb" }));

// A09 (OWASP) — loguea cada request (método, url, status, latencia) en JSON
// estructurado. Va temprano para capturar toda la cadena.
app.use(pinoHttp({ logger }));

app.use(corsMiddleware);

if (process.env.NODE_ENV !== "production") {
  app.use(
    "/api/docs",
    (_req: Request, res: Response, next: NextFunction) => {
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:"
      );
      next();
    },
    swaggerUi.serve,
    swaggerUi.setup(swaggerSpec)
  );
}

app.get("/", (_req, res) => {
  res.json({ success: true, message: "API en línea 🚀", version: APP_VERSION, status: "OK", timestamp: new Date() });
});
app.use("/api", generalLimiter);
registerRoutes(app);

app.use(notFoundMiddleware);
app.use(HandlerError);

export default app;
