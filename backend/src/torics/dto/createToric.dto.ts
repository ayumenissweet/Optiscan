import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ToricBrand } from '../entities/batch.entity';

class EyePrescriptionDto {
  @IsNumber()
  @IsNotEmpty({ message: 'ro not provided' })
  ro: number;

  @IsNumber()
  @IsNotEmpty({ message: 'dia not provided' })
  dia: number;

  @IsNumber()
  @IsNotEmpty({ message: 'sphere not provided' })
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
  @IsNotEmpty({ message: 'client not assigned' })
  clientId: string;

  @IsOptional()
  note?: string;

  @Transform(({ value }) => JSON.parse(value))
  @ValidateNested()
  @Type(() => EyePrescriptionDto)
  left_eye: EyePrescriptionDto;

  @Transform(({ value }) => JSON.parse(value))
  @ValidateNested()
  @Type(() => EyePrescriptionDto)
  right_eye: EyePrescriptionDto;
}
