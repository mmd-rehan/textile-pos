import { Type } from 'class-transformer';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ReconcileRollDto {
  @IsNotEmpty()
  @IsString()
  physicalLengthYard!: string;

  @IsNotEmpty()
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  remarks?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  createRemnant?: boolean;

  @IsOptional()
  @IsString()
  remnantSalePrice?: string;

  @IsOptional()
  @IsString()
  remnantBarcode?: string;
}
