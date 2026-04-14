# Tasks 7-9: Wire into OverworldScene + NPC + Dialog

Modified `src/game/scenes/OverworldScene.ts`:
- Added player facing direction tracking
- Added SPACE/Z as interact keys (per-frame flag)
- Created EventEngine with hard-coded Cotton Town event
- Builds EventContext each frame from player state
- Locks player movement when event engine is blocking (dialog active)
- Placed NPC sprite at tile (20,18) with collision body
- Hard-coded "Talk to Greeter" event: face NPC + press interact → dialog → set_variable
