import {
  ClassSerializerContextOptions,
  ClassSerializerInterceptor,
  ExecutionContext,
} from '@nestjs/common';
import { Uloga } from '../shared/enums/uloga.enum.js';

const ULOGE_SA_KONTAKTOM: Uloga[] = [
  Uloga.UPRAVNIK,
  Uloga.SERVISER,
  Uloga.ADMIN,
];

export class KontaktSerializerInterceptor extends ClassSerializerInterceptor {
  protected getContextOptions(
    context: ExecutionContext,
  ): ClassSerializerContextOptions | undefined {
    const opcije = super.getContextOptions(context);
    const uloga: Uloga | undefined = context.switchToHttp().getRequest()
      .user?.uloga;

    if (!uloga || !ULOGE_SA_KONTAKTOM.includes(uloga)) {
      return opcije;
    }
    return { ...opcije, groups: [...(opcije?.groups ?? []), 'kontakt'] };
  }
}
