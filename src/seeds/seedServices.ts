// src/seeds/seedServices.ts
import { AppDataSource } from "../data-source";
import { Service }      from "../models/Service";

export async function seedServices(): Promise<void> {
  const repo = AppDataSource.getRepository(Service);
  if (await repo.count() > 0) return;
  await repo.save(repo.create([
    { nombre: "Personalización", descripcion: "Servicio integral de atención y asesoría personalizada para materializar las ideas únicas de cada cliente. Dedicamos el tiempo necesario para entender tu visión y convertirla en una pieza irrepetible, desde la concepción del diseño hasta el acabado final.",                                                     duracion: 8,  estado: true },
    { nombre: "Restauración",    descripcion: "Recuperación y conservación de obras originales en diversas técnicas: óleos, acrílicos, espabilados y esculturas. Intervenimos con materiales especializados para devolver la integridad visual y estructural de la pieza, respetando siempre su esencia y valor histórico.",                                          duracion: 15, estado: true },
    { nombre: "Enmarcación",     descripcion: "Enmarcamos todo tipo de piezas con valor sentimental, artístico o coleccionable: diplomas, fotografías, zapatos, billetes, monedas, antigüedades y mucho más. Cada trabajo se realiza con los materiales y el montaje adecuados para proteger y realzar lo que más aprecias.",                                        duracion: 8,  estado: true },
    { nombre: "Decoración",      descripcion: "Asesoría especializada para transformar espacios: ya sea decorar desde cero o reestructurar el diseño actual de un ambiente. Te acompañamos en la selección de composiciones, paletas y elementos decorativos que logren el equilibrio estético que buscas en tu hogar u oficina.",                                    duracion: 15, estado: true },
    { nombre: "Texturizado",     descripcion: "Técnica artística aplicada directamente sobre imágenes o soportes con diseño original. Generamos volumen, profundidad y carácter mediante el uso de texturas, logrando una intervención única que transforma cualquier obra en una pieza con identidad propia.",                                                       duracion: 15, estado: true },
  ]));
  console.log("✅  Servicios sembrados (5)");
}
