import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export type ManualWastageSourceType = 'MANUAL_DAMAGE' | 'MANUAL_WASTAGE';

export class ManualWastageDto {
  @IsNotEmpty()
  @IsString()
  rollId!: string;

  @IsNotEmpty()
  @IsString()
  quantity!: string;

  @IsNotEmpty()
  @IsString()
  unit!: string;

  @IsEnum(['MANUAL_DAMAGE', 'MANUAL_WASTAGE'])
  sourceType!: ManualWastageSourceType;

  @IsNotEmpty()
  @IsString()
  reason!: string;

  @IsOptional()
  @IsString()
  responsibleUserId?: string;
}
