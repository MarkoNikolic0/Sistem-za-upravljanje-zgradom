import { IsEnum } from 'class-validator';
import { Prioritet } from '../../shared/enums/kvar.enums.js';

export class PostaviPrioritetDto {
  @IsEnum(Prioritet)
  prioritetKvara: Prioritet;
}
