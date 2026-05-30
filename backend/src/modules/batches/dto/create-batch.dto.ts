import { IsDateString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateBatchDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  batchNumber!: string;

  @IsOptional()
  @IsString()
  supplierId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @IsOptional()
  @IsDateString()
  receivedAt?: string;
}
