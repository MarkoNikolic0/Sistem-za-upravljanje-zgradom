import { Test, TestingModule } from '@nestjs/testing';
import { ZahtevPovezivanjeService } from './zahtev-povezivanje.service.js';

describe('ZahtevPovezivanjeService', () => {
  let service: ZahtevPovezivanjeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZahtevPovezivanjeService],
    }).compile();

    service = module.get<ZahtevPovezivanjeService>(ZahtevPovezivanjeService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
