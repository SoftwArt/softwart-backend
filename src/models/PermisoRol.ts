// Generado automáticamente por generate-models.js
import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Permiso } from "./Permiso";
import { Rol } from "./Rol";

@Entity("permiso_rol")
export class PermisoRol {

  @ManyToOne(() => Permiso, (x) => x.permisoRoles)
  @PrimaryColumn({ name: "id_permiso", type: "int" })
  @JoinColumn({ name: "id_permiso" })
  permiso!: Permiso;

  @ManyToOne(() => Rol, (x) => x.permisoRoles)
  @PrimaryColumn({ name: "id_rol" })
  @JoinColumn({ name: "id_rol" })
  rol!: Rol;

}
