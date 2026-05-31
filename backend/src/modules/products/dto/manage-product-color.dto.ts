import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddProductColorDto {
  @IsString()
  @IsNotEmpty()
  colorId!: string;
}

export class CreateColorDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  hexCode?: string;
}

export class UpdateColorDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  colorCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  hexCode?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
