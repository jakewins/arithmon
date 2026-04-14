# Wire up arrow key movement and camera follow

- Read arrow key input via Phaser's cursor keys
- Move the player sprite in the pressed direction
- Play the matching walk animation while moving, idle when stopped
- Set the camera to follow the player with `startFollow()`
- Clamp camera to map bounds so it doesn't scroll past edges
