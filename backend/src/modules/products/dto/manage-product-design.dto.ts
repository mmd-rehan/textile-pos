import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class AddProductDesignDto {
  @IsString()
  @IsNotEmpty()
  designId!: string;
}

export class CreateDesignDto {
  @IsString()
  @MaxLength(100)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  designCode?: string;
}
