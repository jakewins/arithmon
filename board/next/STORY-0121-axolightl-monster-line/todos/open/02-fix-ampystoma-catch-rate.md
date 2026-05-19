# Todo: Fix ampystoma catchRate (70, not 100)

Same defect pattern as STORY-0120 (aardart): the evolved form's
catchRate was set to 100 instead of upstream's actual value.

`upstream/mods/tuxemon/db/monster/ampystoma.yaml` has:

```yaml
catch_rate: 70.0
```

Update `src/game/data/monsters.ts` ampystoma entry:

```ts
catchRate: 70,
```

axolightl entry, ampystoma sprite, both movesets, dual type
[lightning, water] for ampystoma, evolution wiring at level 32, all
match upstream.

**Pattern note:** When porting an evolution line, double-check the
`catch_rate:` on the evolved form too — it's often LOWER (e.g. 70)
than the base form (100). Don't reuse the base form's value.
