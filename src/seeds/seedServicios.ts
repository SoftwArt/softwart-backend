// src/seeds/seedServicios.ts
import { AppDataSource } from "../data-source";
import { Servicio }      from "../models/Servicio";

export async function seedServicios(): Promise<void> {
  const repo = AppDataSource.getRepository(Servicio);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Personalización", descripcion: "Creamos marcos y acabados únicos según tus gustos: colores, texturas y estilos a tu medida para que cada pieza sea irrepetible.",                                                                       duracion: 8,  estado: true },
    { nombre: "Restauración",    descripcion: "Recuperamos pinturas dañadas o deterioradas, devolviendo vida y color a la obra sin perder su esencia original.",                                                                                          duracion: 15, estado: true },
    { nombre: "Enmarcación",     descripcion: "Enmarcamos fotografías, pinturas, diplomas, pósters y cualquier obra que quieras proteger y exhibir con estilo.",                                                                                           duracion: 8,  estado: true },
    { nombre: "Decoración",      descripcion: "Diseñamos composiciones decorativas para el hogar o la oficina, combinando marcos, paspartú y acabados que armonizan con tu ambiente.",                                                                    duracion: 15, estado: true },
    { nombre: "Texturizado",     descripcion: "Aplicamos técnicas de textura sobre marcos y superficies para lograr efectos visuales únicos: rústico, moderno, envejecido y más.",                                                                        duracion: 15, estado: true },
  ]));
  console.log("✅  Servicios sembrados (5)");
}
