import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { LensOrder } from "./order.entity";
import { LensBrand } from "./brand.entity";

export enum BatchStatus {
  DRAFT = "Draft",
  SENT = "Sent",
  RECEIVED = "Received",
}

@Entity()
export class Batch {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @ManyToOne(() => LensBrand)
  @JoinColumn()
  brand: LensBrand;

  @Column({ nullable: true })
  code: number;

  @Column({
    type: "simple-enum",
    enum: BatchStatus,
    default: BatchStatus.DRAFT,
  })
  status: BatchStatus;

  @CreateDateColumn({ type: "date" })
  created_at: Date;

  @CreateDateColumn({ type: "date" })
  exported_at: Date;

  //without this array
  @OneToMany(() => LensOrder, (lensOrder) => lensOrder.batch)
  lens_orders: LensOrder[];
}
