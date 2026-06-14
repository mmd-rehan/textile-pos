import { IsDateString, IsOptional } from 'class-validator';

export class SupplierStatementQueryDto {
  @IsOptional()
  @IsDateString()
  fromDate?: string;

  @IsOptional()
  @IsDateString()
  toDate?: string;
}
