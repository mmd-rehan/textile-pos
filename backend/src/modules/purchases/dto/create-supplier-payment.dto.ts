import { IsDateString, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateSupplierPaymentDto {
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @IsString()
  paymentMethod!: string;

  @IsDateString()
  paymentDate!: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
