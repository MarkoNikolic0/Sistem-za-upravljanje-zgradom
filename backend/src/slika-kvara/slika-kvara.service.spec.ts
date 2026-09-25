import { Test, TestingModule } from '@nestjs/testing';
import { SlikaKvaraService } from './slika-kvara.service.js';

describe('SlikaKvaraService', () => {
  let service: SlikaKvaraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SlikaKvaraService],
    }).compile();

    service = module.get<SlikaKvaraService>(SlikaKvaraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
