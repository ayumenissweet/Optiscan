import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Batch } from './batch.entity';
import { Client } from './client.entity';

export class EyePrescription {
  @Column({ type: 'float' })
  ro: number;

  @Column({ type: 'float' })
  dia: number;

  @Column({ type: 'float' })
  sphere: number;

  @Column({ type: 'float', nullable: true })
  cyl?: number;

  @Column({ type: 'float', nullable: true })
  axe?: number;
}

@Entity()
export class LensOrder {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Client, (client) => client.lens_orders, {
    onDelete: 'CASCADE',
  })
  client: Client;

  @Column({ nullable: true })
  note: string;

  @ManyToOne(() => Batch, (batch) => batch.lens_orders, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  batch?: Batch;

  @Column(() => EyePrescription, { prefix: 'left_eye' })
  left_eye: EyePrescription;

  @Column(() => EyePrescription, { prefix: 'right_eye' })
  right_eye: EyePrescription;

  @Column({ type: 'date', nullable: true })
  arrived_at?: Date;
}
