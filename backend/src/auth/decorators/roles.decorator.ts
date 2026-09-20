import { SetMetadata } from '@nestjs/common';
import { Uloga } from '../../shared/enums/uloga.enum.js';

export const ROLES_KEY = 'roles';
export const Roles = (...uloge: Uloga[]) => SetMetadata(ROLES_KEY, uloge);
