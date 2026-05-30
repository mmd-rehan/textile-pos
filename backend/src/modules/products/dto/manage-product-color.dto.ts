import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
}
