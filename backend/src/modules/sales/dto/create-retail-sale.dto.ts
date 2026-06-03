import { Type } from 'class-transformer';
import {
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

// For FABRIC_ROLL products — roll-based sale line
export class SaleLineDto {
  @IsString()
  productId!: string;

  @IsString()
  rollId!: string;

  @IsNumber()
  @IsPositive()
  billedQuantity!: number;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  actualCutQuantity?: number;

  @IsEnum(['YARD', 'METER'])
  unit!: 'YARD' | 'METER';

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

// For FIXED_PRODUCT and CUT_PIECE — quantity-based sale line
export class QuantitySaleLineDto {
  @IsString()
  productId!: string;

  @IsString()
  productStockItemId!: string;

  @IsNumber()
  @IsPositive()
  quantity!: number;

  @IsNumber()
  @Min(0)
  unitPrice!: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  discountAmount?: number;
}

export class SalePaymentDto {
  @IsString()
  method!: string;

  @IsNumber()
  @IsPositive()
  amount!: number;
}

export class CreateRetailSaleDto {
  @IsOptional()
  @IsString()
  customerId?: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  lines?: SaleLineDto[];

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => QuantitySaleLineDto)
  quantityLines?: QuantitySaleLineDto[];

  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments!: SalePaymentDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
