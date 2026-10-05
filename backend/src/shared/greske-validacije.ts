import { BadRequestException, type ValidationError } from '@nestjs/common';

export function greskeValidacije(
  errors: ValidationError[],
): BadRequestException {
  const greske: Record<string, string> = {};

  for (const greska of errors) {
    const poruke = Object.values(greska.constraints ?? {});
    if (poruke.length > 0) {
      greske[greska.property] = poruke[0];
    }
  }

  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: errors.flatMap((greska) =>
      Object.values(greska.constraints ?? {}),
    ),
    greske,
  });
}

export function greskaPolja(polje: string, poruka: string): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: [poruka],
    greske: { [polje]: poruka },
  });
}
