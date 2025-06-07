# Hunter Games 3D

A 3D first-person shooter implementation of the Hunter Games, a three-stage survival game built with Three.js.

## Game Description

The Hunter Games consists of 3 stages:

1. **The Warehouse** - Search for weapons and resources like AK-74, QBB95, Rocket launcher, AKM, L86A2, and AUG A3. Collect ammo and coins.

2. **Reds or Blues** - A team-based arena battle where you're assigned to either the red team or the blue team. Fight against the opposing team, and the top 3 teams advance to the next stage.

3. **The Billionaire Hunter** - Navigate through a forest filled with Vietnam-styled traps while facing off against the billionaire hunter. Survive this stage to win the game.

### Checkpoints
- Between stages 1 and 2: Purchase ammo, food, water, and medical items.
- Between stages 2 and 3: Purchase special weapons like grenades, molotovs, and special ammo (incendiary and explosive).

## How to Play

1. **Controls**:
   - Move: WASD or Arrow Keys
   - Look Around: Mouse movement
   - Shoot: Left Mouse Button
   - The game uses pointer lock for FPS controls - click on the game screen to engage controls

2. **Objectives**:
   - Stage 1: Find at least one weapon to proceed to the next stage.
   - Stage 2: Eliminate the opposing team.
   - Stage 3: Defeat the billionaire hunter to win the game.

## Running the Game

1. Clone or download this repository.
2. Open `index.html` in a modern web browser that supports WebGL and Pointer Lock API (Chrome, Firefox, Edge recommended).
3. Click the "Start Game" button to begin.
4. Click on the game screen to lock your mouse pointer and enable FPS controls.
5. Press ESC to unlock the pointer (this will pause the game).

## Game Features

- Full 3D first-person shooter gameplay
- Three distinct game stages with different environments and objectives
- Multiple weapon types with different damage values
- Inventory system for weapons and items
- Coin collection system to purchase items at checkpoints
- Team-based combat in the second stage
- Boss battle in the final stage
- Realistic pointer-lock based FPS controls

## Technical Details

This game is built using:
- Three.js for 3D rendering
- HTML5 and CSS for UI elements
- JavaScript for game logic
- Pointer Lock API for FPS controls

No external game frameworks are required beyond Three.js.

## Browser Requirements

- WebGL support
- Pointer Lock API support
- Modern browser (Chrome, Firefox, Edge recommended)

## License

This project is open source and available for educational purposes. 