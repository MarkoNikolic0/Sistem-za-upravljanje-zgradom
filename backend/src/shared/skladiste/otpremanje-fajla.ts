import { ParseFilePipeBuilder } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { greskaPolja } from '../greske-validacije.js';

export const PDF = 'application/pdf';
const TIPOVI_FAJLA = /^(image\/(jpeg|png|webp)|application\/pdf)$/;
const MAKS_VELICINA_FAJLA = 10 * 1024 * 1024;

export function otpremanjeFajla(polje: string) {
  return FileInterceptor(polje, {
    limits: { fileSize: MAKS_VELICINA_FAJLA },
    defParamCharset: 'utf8',
  });
}

export function proveraFajla(polje: string, naziv: string) {
  return new ParseFilePipeBuilder()
    .addFileTypeValidator({
      fileType: TIPOVI_FAJLA,
      overrideMimeType: true,
      errorMessage: `${naziv} mora biti PDF, JPG, PNG ili WEBP.`,
    })
    .build({
      fileIsRequired: false,
      exceptionFactory: (poruka) => greskaPolja(polje, poruka),
    });
}
