import { Test, TestingModule } from '@nestjs/testing';
import { ZgradaService } from './zgrada.service.js';

describe('ZgradaService', () => {
  let service: ZgradaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ZgradaService],
    }).compile();

    service = module.get<ZgradaService>(ZgradaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
