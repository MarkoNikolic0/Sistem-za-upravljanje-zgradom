import { SelectQueryBuilder } from 'typeorm';

export async function brojPoZgradi<T extends object>(
  upit: SelectQueryBuilder<T>,
  kolona: string,
  ids: number[],
  broji = 'COUNT(*)',
) {
  const redovi = await upit
    .select(kolona, 'zgradaId')
    .addSelect(broji, 'broj')
    .andWhere(`${kolona} IN (:...ids)`, { ids })
    .groupBy(kolona)
    .getRawMany<{ zgradaId: number; broj: string }>();
  return new Map(redovi.map((r) => [r.zgradaId, Number(r.broj)]));
}
