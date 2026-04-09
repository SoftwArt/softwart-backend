import { Column, Entity, JoinColumn, ManyToOne, OneToOne, PrimaryGeneratedColumn } from "typeorm";
import { Client } from "./Client";
import { AppointmentStatus } from "./AppointmentStatus";
import { Sale } from "./Sale";

@Entity("cita")
export class Appointment {

  @PrimaryGeneratedColumn()
  id_cita!: number;

  @Column({ type: "date" })
  fecha!: Date;

  @Column({ type: "time" })
  hora!: string;

  @Column({ nullable: true })
  observacion?: string;

  @ManyToOne(() => AppointmentStatus, (x) => x.appointments)
  @JoinColumn({ name: "id_estado_cita" })
  appointmentStatus!: AppointmentStatus;

  @ManyToOne(() => Client, (x) => x.appointments)
  @JoinColumn({ name: "id_cliente" })
  client!: Client;

  @OneToOne(() => Sale, (x) => x.appointment)
  sale?: Sale;

}
