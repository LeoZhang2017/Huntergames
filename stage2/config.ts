import { GameConfig } from './GameManager';
import { ResourceType } from './Resource';

// Game duration constants
export const STAGE_ONE_DURATION = 60;  // 1 minute in seconds
export const STAGE_TWO_DURATION = 600; // 10 minutes in seconds

export const DEFAULT_GAME_CONFIG: GameConfig = {
    mapSize: {
        width: 5000,  // 5km wide
        height: 5000  // 5km high
    },
    
    // Define base locations strategically across the map
    baseLocations: [
        // Red Team Bases
        { x: 500, y: 500 },    // Main Base
        { x: 1500, y: 1000 },  // Forward Base 1
        { x: 1000, y: 1500 },  // Forward Base 2
        { x: 2000, y: 2000 },  // Central Base 1
        { x: 1500, y: 2500 },  // Support Base 1
        
        // Blue Team Bases
        { x: 4500, y: 4500 },  // Main Base
        { x: 3500, y: 4000 },  // Forward Base 1
        { x: 4000, y: 3500 },  // Forward Base 2
        { x: 3000, y: 3000 },  // Central Base 1
        { x: 3500, y: 2500 }   // Support Base 1
    ],

    teamStats: {
        maxPlayers: 50,
        startingResources: {
            [ResourceType.ENERGY]: 1000,
            [ResourceType.MATERIALS]: 800,
            [ResourceType.AMMUNITION]: 1000,
            [ResourceType.SUPPLIES]: 500
        },
        resourceCaps: {
            [ResourceType.ENERGY]: 5000,
            [ResourceType.MATERIALS]: 4000,
            [ResourceType.AMMUNITION]: 3000,
            [ResourceType.SUPPLIES]: 2000
        }
    },

    baseStats: {
        maxHealth: 10000,
        defenseRating: 25,
        resourceGenerationRate: {
            [ResourceType.ENERGY]: 5,
            [ResourceType.MATERIALS]: 3,
            [ResourceType.AMMUNITION]: 2,
            [ResourceType.SUPPLIES]: 1
        },
        maxGarrison: 10
    },

    victoryConditions: [
        {
            type: 'score',
            threshold: 10000,
            timeLimit: STAGE_TWO_DURATION
        },
        {
            type: 'domination',
            threshold: 0.8,  // Control 80% of bases
            timeLimit: STAGE_TWO_DURATION
        },
        {
            type: 'resources',
            threshold: 20000,  // Total resources
            timeLimit: STAGE_TWO_DURATION
        },
        {
            type: 'elimination',
            threshold: 1,  // All enemy bases destroyed
            timeLimit: STAGE_TWO_DURATION
        }
    ],

    resourceNodes: [
        // High-value central resource nodes
        {
            type: ResourceType.ENERGY,
            position: { x: 2500, y: 2500 },
            generationRate: 10
        },
        {
            type: ResourceType.MATERIALS,
            position: { x: 2300, y: 2700 },
            generationRate: 8
        },
        {
            type: ResourceType.AMMUNITION,
            position: { x: 2700, y: 2300 },
            generationRate: 6
        },
        {
            type: ResourceType.SUPPLIES,
            position: { x: 2500, y: 2700 },
            generationRate: 4
        },

        // Red team side resource nodes
        {
            type: ResourceType.ENERGY,
            position: { x: 1000, y: 1000 },
            generationRate: 5
        },
        {
            type: ResourceType.MATERIALS,
            position: { x: 1500, y: 500 },
            generationRate: 4
        },

        // Blue team side resource nodes
        {
            type: ResourceType.ENERGY,
            position: { x: 4000, y: 4000 },
            generationRate: 5
        },
        {
            type: ResourceType.MATERIALS,
            position: { x: 3500, y: 4500 },
            generationRate: 4
        }
    ]
}; 