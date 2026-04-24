import dotenv from "dotenv";
dotenv.config();

import "reflect-metadata";
import express, { Application, Request, Response, NextFunction } from "express";
import swaggerUi from "swagger-ui-express";

import { AppDataSource } from "./data-source";
import { runAllSeeds } from "./seeds/index";
import { registerRoutes } from "./routes";
import helmet from "helmet";
import { corsMiddleware, notFoundMiddleware, generalLimiter } from "./middlewares";
import { errorHandler } from "./errors";
import swaggerSpec from "./docs/swagger";

const app: Application = express();
const PORT = Number(process.env.PORT ?? 3000);

app.set("trust proxy", 1);
app.use(helmet());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(corsMiddleware);

// Swagger UI — dev only (docs for production live in softwart-docs repo)
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
  res.json({ success: true, message: "API en línea 🚀", timestamp: new Date() });
});
app.use("/api", generalLimiter);
registerRoutes(app);

app.use(notFoundMiddleware);
app.use(errorHandler);

async function bootstrap(): Promise<void> {
  try {
    console.log("\n🔌  Conectando a la base de datos...");
    await AppDataSource.initialize();
    console.log("✅  Base de datos conectada\n");

    // 🌱 Ejecutar seeds
    await runAllSeeds();

    app.listen(PORT, () => {
      console.log(`🚀  Servidor corriendo en http://localhost:${PORT}\n`);
    });
  } catch (error) {
    console.error("❌  Error al iniciar la aplicación:", error);
    process.exit(1);
  }
}

bootstrap();
