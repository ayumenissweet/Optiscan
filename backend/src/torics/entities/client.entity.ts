import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { LensOrder } from './order.entity';

@Entity()
export class Client {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ nullable: true })
  phone_number?: string;

  @OneToMany(() => LensOrder, (lensOrder) => lensOrder.client)
  lens_orders: LensOrder[];
}
