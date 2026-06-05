import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { QuantitySaleLineDto, SalePaymentDto } from './create-retail-sale.dto';

export { QuantitySaleLineDto, SalePaymentDto };

export class WholesaleSaleLineDto {
  @IsString()
  productId!: string;

  @IsString()
  rollId!: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  billedQuantity?: number;

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

  @IsOptional()
  @IsBoolean()
  isFullRoll?: boolean;
}

export class CreateWholesaleSaleDto {
  @IsString()
  customerId!: string;

  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => WholesaleSaleLineDto)
  lines?: WholesaleSaleLineDto[];

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

  @IsOptional()
  @IsString()
  deliveryChallanNumber?: string;

  @IsOptional()
  @IsString()
  deliveryAddress?: string;
}
