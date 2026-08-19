import { EntityManager } from "typeorm";
import { Client } from "../models/Client";
import { User } from "../models/User";

export class AccountEmailError extends Error {
  constructor(public readonly statusCode: 404 | 409, message: string) {
    super(message);
  }
}

type SyncAccountEmailParams =
  | { id_cliente: number; id_usuario?: never; correo: string }
  | { id_usuario: number; id_cliente?: never; correo: string };

// Client y User no tienen FK entre sí: el correo es su vínculo de negocio.
// Esta función actualiza ambos lados dentro del manager de una transacción.
export async function syncAccountEmail(
  manager: EntityManager,
  params: SyncAccountEmailParams,
): Promise<void> {
  const clientRepo = manager.getRepository(Client);
  const userRepo = manager.getRepository(User);

  const client = params.id_cliente !== undefined
    ? await clientRepo.findOneBy({ id_cliente: params.id_cliente })
    : null;
  const user = params.id_usuario !== undefined
    ? await userRepo.findOneBy({ id_usuario: params.id_usuario })
    : null;

  const sourceClient = client ?? (user ? await clientRepo.findOneBy({ correo: user.correo }) : null);
  const sourceUser = user ?? (client ? await userRepo.findOneBy({ correo: client.correo }) : null);
  if (!sourceClient && !sourceUser) {
    throw new AccountEmailError(404, "Cliente o usuario no encontrado");
  }

  const duplicateClient = await clientRepo.findOneBy({ correo: params.correo });
  if (duplicateClient && duplicateClient.id_cliente !== sourceClient?.id_cliente) {
    throw new AccountEmailError(409, "Ya existe un cliente registrado con ese correo");
  }

  const duplicateUser = await userRepo.findOneBy({ correo: params.correo });
  if (duplicateUser && duplicateUser.id_usuario !== sourceUser?.id_usuario) {
    throw new AccountEmailError(409, "Ya existe un usuario registrado con ese correo");
  }

  if (sourceClient) {
    sourceClient.correo = params.correo;
    await clientRepo.save(sourceClient);
  }
  if (sourceUser) {
    sourceUser.correo = params.correo;
    await userRepo.save(sourceUser);
  }
}