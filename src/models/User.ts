import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Role } from "./Role";

@Entity("usuario")
export class User {

  @PrimaryGeneratedColumn()
  id_usuario!: number;

  @Column({ unique: true })
  correo!: string;

  @Column()
  clave!: string;

  @Column({ type: "boolean" })
  estado!: boolean;

  @Column({ type: "varchar", nullable: true })
  token_recuperacion!: string | null;

  @Column({ type: "timestamp", nullable: true })
  token_expira!: Date | null;

  @ManyToOne(() => Role, (x) => x.users)
  @JoinColumn({ name: "id_rol" })
  role!: Role;

}
