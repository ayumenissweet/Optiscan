import { Column, Entity, PrimaryGeneratedColumn } from "typeorm";

export enum SettingOptions {
  CLIENT = "add-client",
  DATE = "add-date",
}

@Entity()
export class Settings {
  @PrimaryGeneratedColumn("uuid")
  id: string;

  @Column({ type: "simple-enum", enum: SettingOptions, unique: true })
  key: SettingOptions;

  @Column()
  value: boolean;
}
