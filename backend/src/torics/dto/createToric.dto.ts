import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  ValidateNested,
} from "class-validator";
import { Transform, Type } from "class-transformer";
import { ToricBrand } from "../entities/batch.entity";

class EyePrescriptionDto {
  @IsNumber()
  @IsOptional()
  ro: number;

  @IsNumber()
  @IsOptional()
  dia: number;

  @IsNumber()
  @IsOptional()
  sphere: number;

  @IsNumber()
  @IsOptional()
  cyl: number;

  @IsNumber()
  @IsOptional()
  axe: number;
}

export class CreateToricDto {
  @IsEnum(ToricBrand)
  brand: ToricBrand;

  @IsUUID()
  @IsNotEmpty({ message: "client not assigned" })
  clientId: string;

  @IsOptional()
  note?: string;

  @Transform(({ value }) => {
    if (!value) return undefined;
    return typeof value === "string" ? JSON.parse(value) : value;
  })
  @ValidateNested()
  @Type(() => EyePrescriptionDto)
  left_eye?: EyePrescriptionDto;

  @Transform(({ value }) => {
    if (!value) return undefined;
    return typeof value === "string" ? JSON.parse(value) : value;
  })
  @ValidateNested()
  @Type(() => EyePrescriptionDto)
  right_eye?: EyePrescriptionDto;
}
