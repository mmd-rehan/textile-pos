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

// For FIXED_PRODUCT and CUT_PIECE — quantity-based purchase lines
export class CreatePurchaseItemLineDto {
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
  quantity!: number;

  @IsNumber()
  @Min(0)
  purchasePricePerUnit!: number;

  @IsNumber()
  @Min(0)
  salePricePerUnit!: number;

  @IsOptional()
  @IsString()
  barcodeValue?: string;

  @IsOptional()
  @IsString()
  unitId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsString()
  description?: string;
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

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseRollDto)
  rolls?: CreatePurchaseRollDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreatePurchaseItemLineDto)
  items?: CreatePurchaseItemLineDto[];
}
