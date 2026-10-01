import { Test, TestingModule } from '@nestjs/testing';
import { KorisnikService } from './korisnik.service.js';

describe('KorisnikService', () => {
  let service: KorisnikService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [KorisnikService],
    }).compile();

    service = module.get<KorisnikService>(KorisnikService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
