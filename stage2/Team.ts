import { Base } from './Base';
import { Resource, ResourceType } from './Resource';

export enum TeamType {
    RED = 'red',
    BLUE = 'blue'
}

export interface TeamStats {
    maxPlayers: number;
    startingResources: { [key in ResourceType]: number };
    resourceCaps: { [key in ResourceType]: number };
}

export class Team {
    private players: Set<string>;
    private bases: Map<string, Base>;
    private resources: Map<ResourceType, Resource>;
    private score: number;

    constructor(
        public readonly type: TeamType,
        private stats: TeamStats
    ) {
        this.players = new Set();
        this.bases = new Map();
        this.resources = new Map();
        this.score = 0;

        // Initialize starting resources
        Object.entries(stats.startingResources).forEach(([type, amount]) => {
            this.resources.set(type as ResourceType, new Resource(type, amount));
        });
    }

    public addPlayer(playerId: string): boolean {
        if (this.players.size >= this.stats.maxPlayers) return false;
        this.players.add(playerId);
        return true;
    }

    public removePlayer(playerId: string): boolean {
        return this.players.delete(playerId);
    }

    public addBase(base: Base): void {
        this.bases.set(base.id, base);
    }

    public removeBase(baseId: string): boolean {
        return this.bases.delete(baseId);
    }

    public addResource(resource: Resource): boolean {
        const currentResource = this.resources.get(resource.type as ResourceType);
        if (!currentResource) {
            if (resource.amount <= this.stats.resourceCaps[resource.type as ResourceType]) {
                this.resources.set(resource.type as ResourceType, resource);
                return true;
            }
            return false;
        }

        const newAmount = currentResource.amount + resource.amount;
        if (newAmount <= this.stats.resourceCaps[resource.type as ResourceType]) {
            currentResource.amount = newAmount;
            return true;
        }
        return false;
    }

    public consumeResource(type: ResourceType, amount: number): boolean {
        const resource = this.resources.get(type);
        if (!resource || resource.amount < amount) return false;
        
        return resource.subtract(amount);
    }

    public addScore(points: number): void {
        this.score += points;
    }

    public getScore(): number {
        return this.score;
    }

    public getPlayerCount(): number {
        return this.players.size;
    }

    public getBases(): Base[] {
        return Array.from(this.bases.values());
    }

    public getResources(): Map<ResourceType, Resource> {
        return new Map(this.resources);
    }

    public hasPlayer(playerId: string): boolean {
        return this.players.has(playerId);
    }

    public getResourceAmount(type: ResourceType): number {
        return this.resources.get(type)?.amount || 0;
    }

    public updateResources(): void {
        // Update resources from all bases
        this.bases.forEach(base => {
            if (!base.isDestroyed()) {
                base.generateResources();
                const baseResources = base.getResources();
                baseResources.forEach((resource, type) => {
                    this.addResource(resource);
                });
            }
        });
    }
} 