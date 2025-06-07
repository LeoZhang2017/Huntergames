export interface WeaponStats {
    damage: number;
    rateOfFire: number;
    magazineSize: number;
    reloadTime: number;
    accuracy: number;
    range: number;
}

export enum WeaponType {
    ASSAULT_RIFLE,
    SMG,
    SHOTGUN,
    PISTOL,
    MACHINE_PISTOL,
    SNIPER_RIFLE,
    ROCKET_LAUNCHER,
    GRENADE_LAUNCHER,
    MELEE
}

export enum AmmoType {
    STANDARD,
    ARMOR_PIERCING,
    HOLLOW_POINT,
    INCENDIARY
}

export class Weapon {
    private stats: WeaponStats;
    private currentAmmo: number;
    private isReloading: boolean;
    private lastFireTime: number;

    constructor(
        public readonly name: string,
        public readonly type: WeaponType,
        stats: WeaponStats
    ) {
        this.stats = stats;
        this.currentAmmo = stats.magazineSize;
        this.isReloading = false;
        this.lastFireTime = 0;
    }

    public fire(currentTime: number): number {
        if (this.isReloading) return 0;
        if (this.currentAmmo <= 0) {
            this.reload();
            return 0;
        }

        const timeSinceLastFire = currentTime - this.lastFireTime;
        const fireDelay = 60000 / this.stats.rateOfFire; // Convert RPM to milliseconds

        if (timeSinceLastFire < fireDelay) return 0;

        this.currentAmmo--;
        this.lastFireTime = currentTime;
        return this.calculateDamage();
    }

    public reload(): void {
        if (this.isReloading) return;
        
        this.isReloading = true;
        setTimeout(() => {
            this.currentAmmo = this.stats.magazineSize;
            this.isReloading = false;
        }, this.stats.reloadTime * 1000);
    }

    private calculateDamage(): number {
        const accuracyModifier = Math.random() * (1 - this.stats.accuracy);
        return this.stats.damage * (1 - accuracyModifier);
    }

    public getAmmoCount(): number {
        return this.currentAmmo;
    }

    public isCurrentlyReloading(): boolean {
        return this.isReloading;
    }

    public getStats(): WeaponStats {
        return { ...this.stats };
    }
} 