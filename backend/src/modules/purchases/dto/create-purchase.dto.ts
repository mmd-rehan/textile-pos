import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class CreatePurchaseRollDto {
  @IsString()
  productId!: string;

  @IsOptional()
  @IsString()
  colorId?: string;

  @IsOptional()
  @IsString()
  designId?: string;

  @IsNumber()
  @Min(0.0001)
  originalLengthYard!: number;

  @IsNumber()
  @Min(0)
  purchasePricePerYard!: number;

  @IsNumber()
  @Min(0)
  salePricePerYard!: number;

  @IsOptional()
  @IsString()
  location?: string;
}

export class CreatePurchaseDto {
  @IsString()
  supplierId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.000001)
  exchangeRateToBaseCurrency?: number;

  @IsOptional()
  @IsString()
  batchId?: string;

  @IsOptional()
  @IsString()
  batchNumber?: string;

  @IsOptional()
  @IsString()
  batchNotes?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  paidAmount?: number;

  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @IsOptional()
  @IsDateString()
  orderDate?: string;

  @IsOptional()
  @IsDateString()
  deliveryDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRollDto)
  @ArrayMinSize(1)
  rolls!: CreatePurchaseRollDto[];
}
