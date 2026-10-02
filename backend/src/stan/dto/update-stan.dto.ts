import { PartialType } from '@nestjs/swagger';
import { CreateStanDto } from './create-stan.dto.js';

export class UpdateStanDto extends PartialType(CreateStanDto) {}
