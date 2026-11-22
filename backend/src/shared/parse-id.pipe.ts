import { BadRequestException, Injectable, ParseIntPipe } from '@nestjs/common';

@Injectable()
export class ParseIdPipe extends ParseIntPipe {
  constructor() {
    super({
      exceptionFactory: () =>
        new BadRequestException('Broj u adresi nije ispravan.'),
    });
  }
}
