import { BadRequestException, type ValidationError } from '@nestjs/common';

// Greške ugnježdenih objekata dobijaju putanju polja, npr. tacke.0.naslov
function sakupi(
  errors: ValidationError[],
  greske: Record<string, string>,
  roditelj = '',
): string[] {
  return errors.flatMap((greska) => {
    const putanja = roditelj + greska.property;
    const poruke = Object.values(greska.constraints ?? {});
    if (poruke.length > 0) {
      greske[putanja] = poruke[0];
    }
    return [...poruke, ...sakupi(greska.children ?? [], greske, `${putanja}.`)];
  });
}

export function greskeValidacije(
  errors: ValidationError[],
): BadRequestException {
  const greske: Record<string, string> = {};

  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: sakupi(errors, greske),
    greske,
  });
}

export function greskaPolja(
  polje: string,
  poruka: string,
): BadRequestException {
  return new BadRequestException({
    statusCode: 400,
    error: 'Bad Request',
    message: [poruka],
    greske: { [polje]: poruka },
  });
}
