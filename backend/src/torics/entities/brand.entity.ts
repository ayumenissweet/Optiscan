import { Entity, PrimaryColumn } from "typeorm";

@Entity()
export class LensBrand {
  @PrimaryColumn()
  name: string;
}
