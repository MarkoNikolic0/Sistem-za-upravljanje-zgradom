import { Test, TestingModule } from '@nestjs/testing';
import { StanService } from './stan.service.js';

describe('StanService', () => {
  let service: StanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [StanService],
    }).compile();

    service = module.get<StanService>(StanService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
