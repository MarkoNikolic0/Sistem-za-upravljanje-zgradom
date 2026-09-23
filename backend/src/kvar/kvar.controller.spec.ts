import { Test, TestingModule } from '@nestjs/testing';
import { KvarController } from './kvar.controller.js';

describe('KvarController', () => {
  let controller: KvarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KvarController],
    }).compile();

    controller = module.get<KvarController>(KvarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
