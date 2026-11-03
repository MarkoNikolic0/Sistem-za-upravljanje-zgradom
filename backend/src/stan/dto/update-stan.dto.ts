import { PartialType } from '@nestjs/swagger';
import { PodaciStanaDto } from './create-stan.dto.js';

export class UpdateStanDto extends PartialType(PodaciStanaDto) {}
