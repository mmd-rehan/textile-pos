import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class QueryMovementsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 30;

  @IsOptional()
  @IsString()
  productId?: string;

  @IsOptional()
  @IsString()
  rollId?: string;

  @IsOptional()
  @IsString()
  movementType?: string;

  @IsOptional()
  @IsString()
  direction?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
