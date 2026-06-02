import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

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

  @ValidateNested({ each: true })
  @Type(() => SaleLineDto)
  @ArrayMinSize(1)
  lines!: SaleLineDto[];

  @ValidateNested({ each: true })
  @Type(() => SalePaymentDto)
  payments!: SalePaymentDto[];

  @IsOptional()
  @IsString()
  notes?: string;
}
