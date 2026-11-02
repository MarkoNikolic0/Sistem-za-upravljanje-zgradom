const redosled = new Intl.Collator('sr', { numeric: true });

// Po spratu, pa po broju kao broj („2“ pre „10“)
export function poRedosleduStanova(
  a: { sprat: number; broj: string },
  b: { sprat: number; broj: string },
) {
  return a.sprat - b.sprat || redosled.compare(a.broj, b.broj);
}
