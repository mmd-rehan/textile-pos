import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateRemnantDto {
  @IsNotEmpty()
  @IsString()
  rollId!: string;

  @IsNotEmpty()
  @IsString()
  lengthYard!: string;

  @IsNotEmpty()
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  barcode?: string;

  @IsOptional()
  @IsString()
  salePrice?: string;
}
