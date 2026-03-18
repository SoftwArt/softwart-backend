// Generado automáticamente por generate-models.js
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { PermisoRol } from "./PermisoRol";
import { Usuario } from "./Usuario";

@Entity("rol")
export class Rol {

  @PrimaryGeneratedColumn()
  id_rol!: number;

  @Column()
  nombre!: string;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => PermisoRol, (x) => x.rol)
  permisoRoles!: PermisoRol[];

  @OneToMany(() => Usuario, (x) => x.rol)
  usuarios!: Usuario[];

}
