import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Appointment } from "./Appointment";
import { Sale } from "./Sale";
import { LegalAcceptance } from "./LegalAcceptance";

@Entity("cliente")
export class Client {

  @PrimaryGeneratedColumn()
  id_cliente!: number;

  @Column()
  tipoDocumento!: string;

  @Column({ unique: true })
  documento!: string;

  @Column()
  nombre!: string;

  @Column({ unique: true })
  correo!: string;

  @Column()
  telefono?: string;

  @Column({ type: "boolean" })
  estado!: boolean;

  @OneToMany(() => Appointment, (x) => x.client)
  appointments!: Appointment[];

  @OneToMany(() => Sale, (x) => x.client)
  sales!: Sale[];

  @OneToMany(() => LegalAcceptance, (x) => x.client)
  legalAcceptances!: LegalAcceptance[];

}
