# Define monster and technique data models

Create the pure TypeScript data layer — no Phaser dependency:

- `data/techniques.ts` — define a `TechniqueDef` type and a `TECHNIQUES` map.
  One entry: `ram` with power 1.5, accuracy 0.85, range "melee".
- `data/monsters.ts` — define a `MonsterDef` type and a `MONSTERS` map.
  One entry: `rockitten` with base stats (hp, attack, defense, speed) and
  moveset referencing `ram` at level 1.
- `model/Monster.ts` — `Monster` class with computed stats from base stats
  and level (`base * (level + 7)`), `currentHp`, `maxHp`, learned techniques.
  Factory method `Monster.spawn(slug, level)`.

Write unit tests for `Monster.spawn()` verifying stat calculation.
