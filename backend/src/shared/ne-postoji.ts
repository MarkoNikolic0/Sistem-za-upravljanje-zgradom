import { NotFoundException } from '@nestjs/common';

export function nePostoji(naziv: string, id: number): NotFoundException {
  return new NotFoundException(`${naziv} sa id-jem ${id} ne postoji!`);
}
