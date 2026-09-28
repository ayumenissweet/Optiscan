import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
} from "typeorm";
import { LensOrder } from "./order.entity";

export enum BatchStatus {
  DRAFT = "Draft",
  SENT = "Sent",
  RECEIVED = "Received",
}

export enum ToricBrand {
  SOLEKO = "Soleko",
  CORNELIA = "Cornelia",
  VERSA_VIEW = "Versa View",
}

@Entity()
export class Batch {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({
    type: "simple-enum",
    enum: ToricBrand,
  })
  brand: ToricBrand;

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
