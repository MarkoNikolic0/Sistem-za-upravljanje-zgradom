import { Test, TestingModule } from '@nestjs/testing';
import { ZgradaController } from './zgrada.controller.js';

describe('ZgradaController', () => {
  let controller: ZgradaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ZgradaController],
    }).compile();

    controller = module.get<ZgradaController>(ZgradaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
