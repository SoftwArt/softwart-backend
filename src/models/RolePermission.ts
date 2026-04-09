import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from "typeorm";
import { Permission } from "./Permission";
import { Role } from "./Role";

@Entity("permiso_rol")
export class RolePermission {

  @ManyToOne(() => Permission, (x) => x.rolePermissions)
  @PrimaryColumn({ name: "id_permiso", type: "int" })
  @JoinColumn({ name: "id_permiso" })
  permission!: Permission;

  @ManyToOne(() => Role, (x) => x.rolePermissions)
  @PrimaryColumn({ name: "id_rol" })
  @JoinColumn({ name: "id_rol" })
  role!: Role;

}
