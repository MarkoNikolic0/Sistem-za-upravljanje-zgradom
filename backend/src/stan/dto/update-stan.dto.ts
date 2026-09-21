import { PartialType } from '@nestjs/mapped-types';
import { CreateStanDto } from './create-stan.dto.js';

export class UpdateStanDto extends PartialType(CreateStanDto) {}
