import { Test, TestingModule } from '@nestjs/testing';
import { PratilacKvaraService } from './pratilac-kvara.service.js';

describe('PratilacKvaraService', () => {
  let service: PratilacKvaraService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PratilacKvaraService],
    }).compile();

    service = module.get<PratilacKvaraService>(PratilacKvaraService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
