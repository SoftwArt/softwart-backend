import "express";

declare module "express-serve-static-core" {
  interface Request {
    user?: {
      id_usuario: number;
      correo: string;
      id_rol: number;
      rol: string;
      id_cliente?: number | null;
    };
  }
}
