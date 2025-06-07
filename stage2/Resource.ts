export enum ResourceType {
    ENERGY = 'energy',
    MATERIALS = 'materials',
    AMMUNITION = 'ammunition',
    SUPPLIES = 'supplies'
}

export class Resource {
    constructor(
        public readonly type: ResourceType | string,
        public amount: number
    ) {}

    public static createEnergy(amount: number): Resource {
        return new Resource(ResourceType.ENERGY, amount);
    }

    public static createMaterials(amount: number): Resource {
        return new Resource(ResourceType.MATERIALS, amount);
    }

    public static createAmmunition(amount: number): Resource {
        return new Resource(ResourceType.AMMUNITION, amount);
    }

    public static createSupplies(amount: number): Resource {
        return new Resource(ResourceType.SUPPLIES, amount);
    }

    public add(amount: number): void {
        this.amount += amount;
    }

    public subtract(amount: number): boolean {
        if (this.amount < amount) return false;
        this.amount -= amount;
        return true;
    }

    public isEmpty(): boolean {
        return this.amount <= 0;
    }

    public clone(): Resource {
        return new Resource(this.type, this.amount);
    }
} 