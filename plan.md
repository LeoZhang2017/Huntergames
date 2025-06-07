# Combat System Plan - Red vs Blue Team Battle

## Overview
This document outlines the core systems and mechanics for the Red vs Blue team battle game, focusing on Stage 2 implementation.

## Weapons System

### Primary Weapons
1. **Assault Rifles**
   - AR-1 "Peacekeeper"
     - Damage: 25 per shot
     - Rate of Fire: 600 RPM
     - Magazine: 30 rounds
     - Reload Time: 2.5s
     - Accuracy: High
     - Range: Medium-Long

   - BR-2 "Precision's Voice"
     - Damage: 20 per shot
     - Burst: 3 rounds
     - Rate of Fire: 800 RPM (in burst)
     - Magazine: 36 rounds
     - Reload Time: 2.2s
     - Accuracy: Very High
     - Range: Long

2. **SMGs**
   - SM-1 "Hurricane"
     - Damage: 18 per shot
     - Rate of Fire: 900 RPM
     - Magazine: 35 rounds
     - Reload Time: 1.8s
     - Accuracy: Medium
     - Range: Short-Medium

   - SM-2 "Whisper"
     - Damage: 20 per shot
     - Rate of Fire: 750 RPM
     - Magazine: 25 rounds
     - Reload Time: 1.5s
     - Accuracy: High
     - Range: Medium

3. **Shotguns**
   - SG-1 "Thunder"
     - Damage: 120 (12 pellets × 10)
     - Rate of Fire: 60 RPM
     - Magazine: 6 shells
     - Reload Time: 0.5s per shell
     - Spread: Medium
     - Range: Very Short

   - SG-2 "Tempest"
     - Damage: 80 (8 pellets × 10)
     - Rate of Fire: 180 RPM
     - Magazine: 8 shells
     - Reload Time: 2.8s
     - Spread: Wide
     - Range: Short

### Secondary Weapons
1. **Pistols**
   - P-1 "Trusty"
     - Damage: 30 per shot
     - Rate of Fire: 380 RPM
     - Magazine: 12 rounds
     - Reload Time: 1.5s
     - Accuracy: High
     - Range: Medium

   - P-2 "Judge"
     - Damage: 45 per shot
     - Rate of Fire: 150 RPM
     - Magazine: 8 rounds
     - Reload Time: 1.8s
     - Accuracy: Very High
     - Range: Medium-Long

2. **Machine Pistols**
   - MP-1 "Fury"
     - Damage: 15 per shot
     - Burst: 3 rounds
     - Rate of Fire: 1000 RPM (in burst)
     - Magazine: 21 rounds
     - Reload Time: 1.6s
     - Accuracy: Medium
     - Range: Short-Medium

### Special Weapons
1. **Sniper Rifles**
   - SR-1 "Whisperwind"
     - Damage: 150 per shot
     - Rate of Fire: 45 RPM
     - Magazine: 5 rounds
     - Reload Time: 3s
     - Accuracy: Perfect
     - Range: Very Long

   - SR-2 "Quicksilver"
     - Damage: 85 per shot
     - Rate of Fire: 90 RPM
     - Magazine: 10 rounds
     - Reload Time: 2.8s
     - Accuracy: Very High
     - Range: Long

2. **Heavy Weapons**
   - RL-1 "Judgment"
     - Damage: 120 (direct) + 80 (splash)
     - Rate of Fire: 30 RPM
     - Magazine: 1 rocket
     - Reload Time: 3.5s
     - Splash Radius: 3 meters
     - Range: Long

   - GL-1 "Thumper"
     - Damage: 85 (direct) + 65 (splash)
     - Rate of Fire: 90 RPM
     - Magazine: 6 grenades
     - Reload Time: 3s
     - Splash Radius: 2.5 meters
     - Range: Medium

### Melee Weapons
1. **Combat Knife**
   - Quick Attack: 35 damage
   - Heavy Attack: 85 damage
   - Attack Speed: Fast
   - Range: Very Short

2. **Energy Sword**
   - Quick Attack: 50 damage
   - Heavy Attack: 100 damage
   - Attack Speed: Medium
   - Range: Short
   - Special: Shield damage bonus

### Weapon Modifications
1. **Sights**
   - Red Dot (1.2x zoom)
   - ACOG (3x zoom)
   - Holographic (1.5x zoom)

2. **Barrels**
   - Suppressor
   - Extended Barrel
   - Compensator

3. **Magazines**
   - Extended Mag (+50% capacity)
   - Quick-Release (-20% reload time)
   - Armor Piercing (+shield damage)

### Ammunition Types
1. **Standard Rounds**
   - Balanced damage
   - Normal penetration
   - Standard velocity

2. **Special Rounds**
   - Armor Piercing
   - Hollow Point
   - Incendiary

## Implementation Priority
1. Core battlefield systems
2. Base management and resources
3. Combat and objective mechanics
4. Team synergy features
5. Environmental elements
6. Victory conditions
7. Technical optimization
8. Polish and balance

## Technical Considerations
### Networking
- Client-Server Architecture
- Performance optimization
- Anti-cheat measures
- Cross-platform compatibility

## Future Enhancements
### Competitive Features
- Ranked System
- Tournament Support
- Spectator Mode
- Match Statistics

### Customization
- Team Features
- Visual Effects
- Audio Systems
- Seasonal Events

*For detailed Stage 2 specifications, refer to stage2_plan.md*
