import { Team, TeamType, TeamStats } from './Team';
import { Base, BaseStats } from './Base';
import { Resource, ResourceType } from './Resource';
import { Timer } from './Timer';
import { STAGE_TWO_DURATION } from './config';

export interface VictoryCondition {
    type: 'score' | 'domination' | 'resources' | 'elimination';
    threshold: number;
    timeLimit?: number;
}

export interface GameConfig {
    mapSize: { width: number; height: number };
    baseLocations: { x: number; y: number }[];
    teamStats: TeamStats;
    baseStats: BaseStats;
    victoryConditions: VictoryCondition[];
    resourceNodes: {
        type: ResourceType;
        position: { x: number; y: number };
        generationRate: number;
    }[];
}

export class GameManager {
    private teams: Map<TeamType, Team>;
    private bases: Map<string, Base>;
    private gameConfig: GameConfig;
    private isGameOver: boolean;
    private timer: Timer;

    constructor(config: GameConfig) {
        this.gameConfig = config;
        this.teams = new Map();
        this.bases = new Map();
        this.isGameOver = false;
        this.timer = new Timer(STAGE_TWO_DURATION);

        this.initializeGame();
    }

    private initializeGame(): void {
        // Initialize teams
        this.teams.set(TeamType.RED, new Team(TeamType.RED, this.gameConfig.teamStats));
        this.teams.set(TeamType.BLUE, new Team(TeamType.BLUE, this.gameConfig.teamStats));

        // Initialize bases
        this.gameConfig.baseLocations.forEach((location, index) => {
            const team = index < this.gameConfig.baseLocations.length / 2 ? 
                TeamType.RED : TeamType.BLUE;
            
            const base = new Base(
                `base_${index}`,
                this.teams.get(team)!,
                this.gameConfig.baseStats,
                location
            );

            this.bases.set(base.id, base);
            this.teams.get(team)!.addBase(base);
        });
    }

    public update(): void {
        if (this.isGameOver) return;

        // Check if time is up
        if (this.timer.isTimeUp()) {
            const winner = this.evaluateTimeBasedVictory();
            if (winner) {
                this.endGame(winner);
            } else {
                // Handle tie game
                this.endGame(null);
            }
            return;
        }

        // Update resources for all teams
        this.teams.forEach(team => team.updateResources());

        // Check victory conditions
        this.checkVictoryConditions();
    }

    private checkVictoryConditions(): void {
        for (const condition of this.gameConfig.victoryConditions) {
            const winner = this.evaluateVictoryCondition(condition);
            if (winner) {
                this.endGame(winner);
                break;
            }
        }
    }

    private evaluateVictoryCondition(condition: VictoryCondition): Team | null {
        const redTeam = this.teams.get(TeamType.RED)!;
        const blueTeam = this.teams.get(TeamType.BLUE)!;

        switch (condition.type) {
            case 'score':
                if (redTeam.getScore() >= condition.threshold) return redTeam;
                if (blueTeam.getScore() >= condition.threshold) return blueTeam;
                break;

            case 'domination':
                const redBases = redTeam.getBases().filter(b => !b.isDestroyed()).length;
                const blueBases = blueTeam.getBases().filter(b => !b.isDestroyed()).length;
                const totalBases = this.bases.size;

                if (redBases / totalBases >= condition.threshold) return redTeam;
                if (blueBases / totalBases >= condition.threshold) return blueTeam;
                break;

            case 'resources':
                const redResources = Array.from(redTeam.getResources().values())
                    .reduce((sum, resource) => sum + resource.amount, 0);
                const blueResources = Array.from(blueTeam.getResources().values())
                    .reduce((sum, resource) => sum + resource.amount, 0);

                if (redResources >= condition.threshold) return redTeam;
                if (blueResources >= condition.threshold) return blueTeam;
                break;

            case 'elimination':
                if (redTeam.getBases().every(b => b.isDestroyed())) return blueTeam;
                if (blueTeam.getBases().every(b => b.isDestroyed())) return redTeam;
                break;
        }

        return null;
    }

    private evaluateTimeBasedVictory(): Team | null {
        const redTeam = this.teams.get(TeamType.RED)!;
        const blueTeam = this.teams.get(TeamType.BLUE)!;

        // Compare scores
        if (redTeam.getScore() > blueTeam.getScore()) return redTeam;
        if (blueTeam.getScore() > redTeam.getScore()) return blueTeam;

        // Compare remaining bases
        const redBases = redTeam.getBases().filter(b => !b.isDestroyed()).length;
        const blueBases = blueTeam.getBases().filter(b => !b.isDestroyed()).length;
        if (redBases > blueBases) return redTeam;
        if (blueBases > redBases) return blueTeam;

        // Compare resources as tiebreaker
        const redResources = Array.from(redTeam.getResources().values())
            .reduce((sum, resource) => sum + resource.amount, 0);
        const blueResources = Array.from(blueTeam.getResources().values())
            .reduce((sum, resource) => sum + resource.amount, 0);
        
        if (redResources > blueResources) return redTeam;
        if (blueResources > redResources) return blueTeam;

        return null; // True tie
    }

    private endGame(winner: Team | null): void {
        this.isGameOver = true;
        this.timer.pause();
        // Additional end game logic can be added here
    }

    public pauseGame(): void {
        this.timer.pause();
    }

    public resumeGame(): void {
        this.timer.resume();
    }

    public getTeam(type: TeamType): Team | undefined {
        return this.teams.get(type);
    }

    public getBase(baseId: string): Base | undefined {
        return this.bases.get(baseId);
    }

    public getAllBases(): Base[] {
        return Array.from(this.bases.values());
    }

    public getGameStatus(): {
        isOver: boolean;
        remainingTime: string;
        teams: {
            type: TeamType;
            score: number;
            resources: { [key in ResourceType]: number };
            bases: number;
        }[];
    } {
        return {
            isOver: this.isGameOver,
            remainingTime: this.timer.getRemainingTimeFormatted(),
            teams: Array.from(this.teams.values()).map(team => ({
                type: team.type,
                score: team.getScore(),
                resources: Object.values(ResourceType).reduce((acc, type) => ({
                    ...acc,
                    [type]: team.getResourceAmount(type)
                }), {} as { [key in ResourceType]: number }),
                bases: team.getBases().filter(b => !b.isDestroyed()).length
            }))
        };
    }
} 