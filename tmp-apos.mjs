import { readFileSync, writeFileSync } from 'node:fs';

for (const f of [
  'animal-sounds.ts',
  'opposites-friends.ts',
  'feeling-friends.ts',
  'wheres-teddy.ts',
  'rhyme-time.ts',
]) {
  const path = `src/data/${f}`;
  const src = readFileSync(path, 'utf8');
  const next = src.replace(/Let\u2019s/g, "Let's");
  writeFileSync(path, next);
  console.log(`${next === src ? 'SKIP' : 'OK  '}  ${f}`);
}
