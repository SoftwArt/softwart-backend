import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RolePermission } from "./RolePermission";

@Entity("permiso")
export class Permission {

  @PrimaryGeneratedColumn()
  id_permiso!: number;

  @Column()
  nombre!: string;

  @Column()
  descripcion!: string;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => RolePermission, (x) => x.permission)
  rolePermissions!: RolePermission[];

}
