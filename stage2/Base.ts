import { Resource } from './Resource';
import { Team } from './Team';

export interface BaseStats {
    maxHealth: number;
    defenseRating: number;
    resourceGenerationRate: { [key: string]: number };
    maxGarrison: number;
}

export class Base {
    private health: number;
    private resources: Map<string, Resource>;
    private garrisonedPlayers: number;
    
    constructor(
        public readonly id: string,
        public readonly team: Team,
        private stats: BaseStats,
        private position: { x: number, y: number }
    ) {
        this.health = stats.maxHealth;
        this.resources = new Map();
        this.garrisonedPlayers = 0;
    }

    public takeDamage(amount: number): number {
        const mitigatedDamage = amount * (1 - this.stats.defenseRating / 100);
        this.health = Math.max(0, this.health - mitigatedDamage);
        return this.health;
    }

    public repair(amount: number): number {
        this.health = Math.min(this.stats.maxHealth, this.health + amount);
        return this.health;
    }

    public addResource(resource: Resource): boolean {
        if (this.resources.has(resource.type)) {
            const currentResource = this.resources.get(resource.type)!;
            currentResource.amount += resource.amount;
            return true;
        }
        this.resources.set(resource.type, resource);
        return true;
    }

    public consumeResource(type: string, amount: number): boolean {
        const resource = this.resources.get(type);
        if (!resource || resource.amount < amount) return false;
        
        resource.amount -= amount;
        if (resource.amount <= 0) {
            this.resources.delete(type);
        }
        return true;
    }

    public garrisonPlayer(): boolean {
        if (this.garrisonedPlayers >= this.stats.maxGarrison) return false;
        
        this.garrisonedPlayers++;
        return true;
    }

    public ungarrisonPlayer(): boolean {
        if (this.garrisonedPlayers <= 0) return false;
        
        this.garrisonedPlayers--;
        return true;
    }

    public generateResources(): void {
        Object.entries(this.stats.resourceGenerationRate).forEach(([type, rate]) => {
            const resource = this.resources.get(type) || new Resource(type, 0);
            resource.amount += rate;
            this.resources.set(type, resource);
        });
    }

    public getHealth(): number {
        return this.health;
    }

    public getResources(): Map<string, Resource> {
        return new Map(this.resources);
    }

    public getPosition(): { x: number, y: number } {
        return { ...this.position };
    }

    public getGarrisonCount(): number {
        return this.garrisonedPlayers;
    }

    public isDestroyed(): boolean {
        return this.health <= 0;
    }
} 