# Todo: Candy Town and Port

## What

Add Candy Town -- the largest town in the campaign -- with its port, inn (2 floors), cafe, hospital (3 floors), and healing center. The port offers river transport between all towns.

## Why

Candy Town is the campaign's central hub. The port with Captain fast-travel is essential for backtracking. The hospital is where the spyder bite plague storyline plays out. The cafe has flashback sequences. This is also where the Greenwash storyline begins.

## Upstream Reference

**Source files:**
- Maps: `spyder_candy_town.tmx`, `spyder_candy_port.tmx`, `spyder_candy_inn1.tmx`, `spyder_candy_inn2.tmx`, `spyder_candy_cafe.tmx`, `spyder_candy_center.tmx`, `spyder_candy_hospital1.tmx`, `spyder_candy_hospital2.tmx`, `spyder_candy_hospital3.tmx`
- Events: `spyder_candy_port.yaml`, `spyder_candy_inn1.yaml`, `spyder_candy_inn2.yaml`, `spyder_candy_cafe.yaml`, `spyder_candy_center.yaml`

**River transport (Captain at port):**
```yaml
# Player chooses destination from dialog choice
CaptainTravel:
  actions:
    - translated_dialog_choice paper:leather:flower:timber:candy,travel_dest
    - transition_teleport player,spyder_paper_town,5,8,0.3    # if paper chosen
```
The Captain offers boat travel to all towns the player has visited.

**Hospital:**
- 3 floors connected by elevator (via healing center)
- Plague treatment events (requires `char_plague`, `quarantine` from STORY-0049)
- NPC patients with dialog

**Cafe:**
- Healing option
- Flashback sequences using `set_layer` sepia tint
- Greenwash incident backstory

## Implementation

1. **Export ~9 maps** from upstream
2. **Create Candy Town events**: Large town hub, many building doors, NPC spawns
3. **River transport system**:
   - Captain NPC at port with destination choice dialog
   - `translated_dialog_choice` with town options
   - Conditional teleports based on which towns player has visited (check variables like `seentimber`, etc.)
4. **Hospital floor events**:
   - Elevator transitions from center to hospital floors
   - Patient NPCs, doctor dialog
   - Plague treatment events (may use stubs if plague system not fully implemented)
5. **Cafe events**:
   - Healing NPC
   - Flashback sequences: lock controls → set_layer sepia → spawn flashback NPCs → dialog → clear
6. **Inn events**: Floor transitions, NPC interactions (monks, pirates, Prof)

## Verify with Puppeteer

Use `/puppeteer` to:
1. Enter Candy Town -- screenshot overview
2. Visit port -- talk to Captain, verify travel choices appear
3. Choose a destination -- verify teleport to that town works
4. Enter inn -- navigate both floors
5. Enter cafe -- verify healing NPC works
6. Enter healing center -- verify Cathedral billing
7. Navigate hospital floors via elevator -- verify floor transitions
8. Return to port, travel back to Candy Town

## Done When

- Candy Town hub with all ~8 buildings accessible
- River transport lets player fast-travel between towns
- Hospital 3 floors navigable
- Cafe with healing and flashback events
- Inn with 2 floors and NPCs
- All town connections work
