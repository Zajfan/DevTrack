/** Numeric release order; two components imply patch zero; unscheduled is last. */
export function compareVersions(a: string, b: string): number {
  if (!a || !b) return a === b ? 0 : a ? -1 : 1;
  const parse = (v: string) => {
    const release = v.split('+')[0];
    const separator = release.indexOf('-');
    return {
      numbers: (separator < 0 ? release : release.slice(0, separator)).split('.').map(BigInt),
      pre: separator < 0 ? [] : release.slice(separator + 1).split('.'),
    };
  };
  const x = parse(a), y = parse(b);
  for (let i = 0; i < 3; i++) {
    const left = x.numbers[i] ?? 0n, right = y.numbers[i] ?? 0n;
    if (left !== right) return left < right ? -1 : 1;
  }
  if (!x.pre.length || !y.pre.length) return x.pre.length === y.pre.length ? 0 : x.pre.length ? -1 : 1;
  for (let i = 0; i < Math.max(x.pre.length, y.pre.length); i++) {
    const left = x.pre[i], right = y.pre[i];
    if (left === undefined || right === undefined) return left === right ? 0 : left === undefined ? -1 : 1;
    if (left === right) continue;
    const ln = /^\d+$/.test(left), rn = /^\d+$/.test(right);
    if (ln && rn) return BigInt(left) < BigInt(right) ? -1 : 1;
    if (ln !== rn) return ln ? -1 : 1;
    return left < right ? -1 : 1;
  }
  return 0;
}

export function compareCreatedNewest(a: { id: number; created_at: string }, b: { id: number; created_at: string }): number {
  const timestamp = (value: string) => Date.parse(value.includes('T') ? value : value.replace(' ', 'T') + 'Z') || 0;
  return timestamp(b.created_at) - timestamp(a.created_at) || b.id - a.id;
}
