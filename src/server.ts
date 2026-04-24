import dotenv from "dotenv";
dotenv.config();

import { AppDataSource } from "./data-source";
import { runAllSeeds } from "./seeds/index";
import app from "./app";

const PORT = Number(process.env.PORT ?? 3000);

async function bootstrap(): Promise<void> {
  try {
    console.log("\n🔌  Conectando a la base de datos...");
    await AppDataSource.initialize();
    console.log("✅  Base de datos conectada\n");

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
