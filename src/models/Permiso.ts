// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PermisoRol } from "./PermisoRol";

@Entity("permiso")
export class Permiso {

  @PrimaryGeneratedColumn()
  id_permiso!: number;

  @Column()
  nombre!: string;

  @Column()
  descripcion!: string;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => PermisoRol, (x) => x.permiso)
  permisoRoles!: PermisoRol[];

}
