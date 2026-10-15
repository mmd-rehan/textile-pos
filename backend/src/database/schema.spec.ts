import { readFileSync } from 'fs';
import path from 'path';

const schema = readFileSync(path.resolve(__dirname, '../../prisma/schema.prisma'), 'utf8');

/** Yields [model, field, type] for every field line in the Prisma schema. */
function* fields(): Generator<[string, string, string]> {
  let model = '';
  for (const raw of schema.split('\n')) {
    const line = raw.trim();
    const open = line.match(/^model\s+(\w+)\s*\{/);
    if (open) {
      model = open[1];
      continue;
    }
    if (line === '}') {
      model = '';
      continue;
    }
    const field = line.match(/^(\w+)\s+(\w+)/);
    if (model && field && !line.startsWith('@@')) yield [model, field[1], field[2]];
  }
}

describe('Prisma schema', () => {
  it('never stores values as Float (money and lengths must be Decimal)', () => {
    const floats = [...fields()].filter(([, , type]) => type === 'Float').map(([m, f]) => `${m}.${f}`);
    expect(floats).toEqual([]);
  });

  it('uses Decimal for every money, price, quantity and length field', () => {
    const pattern = /(amount|price|balance|total|quantity|length|cost|rate|discount|tax|debit|credit)/i;
    const exceptions = new Set(['taxEnabled', 'taxLabel', 'creditLimitEnabled']);
    const offenders = [...fields()]
      .filter(([, name, type]) => pattern.test(name) && !exceptions.has(name) && !['Decimal', 'Boolean', 'String', 'DateTime'].includes(type))
      .filter(([, , type]) => /^(Int|BigInt|Float)$/.test(type))
      .map(([m, f, t]) => `${m}.${f}: ${t}`);
    expect(offenders).toEqual([]);
  });
});
