import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Appointment } from "./Appointment";

@Entity("estado_cita")
export class AppointmentStatus {

  @PrimaryGeneratedColumn()
  id_estado_cita!: number;

  @Column()
  nombre!: string;

  @OneToMany(() => Appointment, (x) => x.appointmentStatus)
  appointments!: Appointment[];

}
