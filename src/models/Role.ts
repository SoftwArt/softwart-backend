import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { RolePermission } from "./RolePermission";
import { User } from "./User";

@Entity("rol")
export class Role {

  @PrimaryGeneratedColumn()
  id_rol!: number;

  @Column({ unique: true })
  nombre!: string;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => RolePermission, (x) => x.role)
  rolePermissions!: RolePermission[];

  @OneToMany(() => User, (x) => x.role)
  users!: User[];

}
