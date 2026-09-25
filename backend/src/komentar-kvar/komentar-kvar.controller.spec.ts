import { Test, TestingModule } from '@nestjs/testing';
import { KomentarKvarController } from './komentar-kvar.controller.js';

describe('KomentarKvarController', () => {
  let controller: KomentarKvarController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KomentarKvarController],
    }).compile();

    controller = module.get<KomentarKvarController>(KomentarKvarController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
