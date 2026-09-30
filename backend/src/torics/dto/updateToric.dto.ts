import { OmitType, PartialType } from "@nestjs/mapped-types";
import { ValidateNested, IsOptional } from "class-validator";
import { Transform, Type } from "class-transformer";
import { CreateToricDto, EyePrescriptionDto } from "./createToric.dto";

export class UpdateEyePrescriptionDto extends PartialType(EyePrescriptionDto) {}

export class UpdateToricDto extends PartialType(
  OmitType(CreateToricDto, ["left_eye", "right_eye"] as const),
) {
  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return typeof value === "string" ? JSON.parse(value) : value;
  })
  @ValidateNested()
  @Type(() => UpdateEyePrescriptionDto)
  left_eye?: UpdateEyePrescriptionDto;

  @IsOptional()
  @Transform(({ value }) => {
    if (!value) return undefined;
    return typeof value === "string" ? JSON.parse(value) : value;
  })
  @ValidateNested()
  @Type(() => UpdateEyePrescriptionDto)
  right_eye?: UpdateEyePrescriptionDto;
}
