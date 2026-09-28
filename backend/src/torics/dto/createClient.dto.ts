import { IsNotEmpty } from "class-validator";

export class createClientDto {
  @IsNotEmpty({ message: "name not provided for the client" })
  name: string;

  phone_number?: string;
}
