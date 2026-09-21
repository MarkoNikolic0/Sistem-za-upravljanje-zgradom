import { Test, TestingModule } from '@nestjs/testing';
import { StanController } from './stan.controller.js';

describe('StanController', () => {
  let controller: StanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [StanController],
    }).compile();

    controller = module.get<StanController>(StanController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
