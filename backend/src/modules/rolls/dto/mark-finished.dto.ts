import { IsNotEmpty, IsString } from 'class-validator';

export class MarkFinishedDto {
  @IsNotEmpty()
  @IsString()
  reason!: string;
}
