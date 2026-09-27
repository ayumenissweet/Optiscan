import { IsOptional, IsString, IsDate, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { SettingOptions } from "../entities/settings.entity";

export class SettingsDataDto {
  @IsOptional()
  [SettingOptions.CLIENT]?: boolean;

  @IsOptional()
  [SettingOptions.DATE]?: boolean;
}

export class UpdateSettingsDto {
  @ValidateNested()
  @Type(() => SettingsDataDto)
  data: SettingsDataDto;
}
