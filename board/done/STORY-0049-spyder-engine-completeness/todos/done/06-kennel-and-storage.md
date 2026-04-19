# Todo: Kennel and Storage System

## What

Implement monster kennel/storage: `create_kennel`, `set_kennel_visible`, `has_kennel`, and `kennel` condition. Expand the existing `access_pc` stub into a working storage UI.

## Why

When the player catches more than 6 monsters, extras go to storage. The kennel system is how Tuxemon manages this -- kennels are named storage boxes the player can create and manage. The Cathedral centers have PCs where players access their kennels. The `access_pc` action already exists as a stub showing placeholder dialog.

## Upstream Reference

**`create_kennel`** -- Create a named kennel:
```yaml
- create_kennel player,Kennel         # create default kennel
- create_kennel player,Quarantine     # quarantine kennel for plague
```

**`set_kennel_visible`** -- Show/hide kennel in menus:
```yaml
- set_kennel_visible player,Quarantine,true
```

**`has_kennel`** condition -- Check monster count in kennel:
```yaml
- is has_kennel player,Kennel,less_than,30     # kennel not full
- is has_kennel player,Quarantine,greater_or_equal,1  # has quarantined monsters
```

**`kennel`** condition -- Check kennel existence/visibility:
```yaml
- is kennel player,Kennel,exist      # kennel exists
- is kennel player,Kennel,visible    # kennel is visible in menu
```

The existing `session.ts` already has a `monsterStorage: MonsterInstance[]` field. This todo upgrades it to named kennels.

## Implementation

1. **Upgrade storage model** (`src/game/session.ts`):
   - Replace `monsterStorage: MonsterInstance[]` with `kennels: Record<string, { monsters: MonsterInstance[], visible: boolean }>`
   - Migrate existing storage to a default "Kennel" kennel
   - Add helper methods: `createKennel(name)`, `storeMonster(kennel, monster)`, `withdrawMonster(kennel, index)`

2. **Implement actions**:
   - `create_kennel`: Create named kennel in session
   - `set_kennel_visible`: Toggle visibility flag

3. **Implement conditions**:
   - `has_kennel`: Count monsters in named kennel, compare with operator
   - `kennel`: Check existence or visibility of named kennel

4. **Upgrade `access_pc`** to launch a storage UI:
   - Show list of kennels
   - Allow deposit/withdraw of monsters between party and kennel
   - Can reuse the PartyScreen style as a starting point
   - At minimum: list stored monsters, withdraw to party (if party < 6), deposit from party (if party > 1)

## Verify with Puppeteer

Use `/puppeteer` to:
1. Trigger `create_kennel player,TestKennel` event
2. Add 7 monsters to party -- verify 7th goes to storage
3. Access PC -- verify storage UI shows
4. Withdraw a monster -- verify it joins party
5. Deposit a monster -- verify it leaves party
6. Test `has_kennel` condition with count checks
7. Test `kennel` condition for existence

## Done When

- Named kennels can be created and managed
- `access_pc` opens a working storage UI (not just placeholder dialog)
- Players can deposit and withdraw monsters
- Kennel conditions check count and existence correctly
- Monster overflow from captures goes to default kennel
