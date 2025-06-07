import { Weapon, WeaponType, WeaponStats } from './Weapon';

export class BurstWeapon extends Weapon {
    private burstCount: number;
    private burstDelay: number;
    private shotsInBurst: number;

    constructor(
        name: string,
        stats: WeaponStats,
        burstCount: number = 3,
        burstDelay: number = 50
    ) {
        super(name, WeaponType.ASSAULT_RIFLE, stats);
        this.burstCount = burstCount;
        this.burstDelay = burstDelay;
        this.shotsInBurst = 0;
    }

    public override fire(currentTime: number): number {
        if (this.isCurrentlyReloading()) return 0;
        
        const damage = super.fire(currentTime);
        if (damage > 0) {
            this.shotsInBurst++;
            if (this.shotsInBurst < this.burstCount) {
                setTimeout(() => this.fire(Date.now()), this.burstDelay);
            } else {
                this.shotsInBurst = 0;
            }
        }
        return damage;
    }
}

export class ShotgunWeapon extends Weapon {
    private pelletCount: number;
    private spreadAngle: number;

    constructor(
        name: string,
        stats: WeaponStats,
        pelletCount: number = 12,
        spreadAngle: number = 30
    ) {
        super(name, WeaponType.SHOTGUN, stats);
        this.pelletCount = pelletCount;
        this.spreadAngle = spreadAngle;
    }

    public override fire(currentTime: number): number {
        if (this.isCurrentlyReloading()) return 0;

        const baseDamage = super.fire(currentTime);
        if (baseDamage <= 0) return 0;

        let totalDamage = 0;
        for (let i = 0; i < this.pelletCount; i++) {
            const spreadModifier = Math.random() * this.spreadAngle - this.spreadAngle / 2;
            const pelletDamage = (baseDamage / this.pelletCount) * Math.cos(spreadModifier * Math.PI / 180);
            totalDamage += pelletDamage;
        }
        return totalDamage;
    }
}

export class ExplosiveWeapon extends Weapon {
    private splashRadius: number;
    private splashDamage: number;

    constructor(
        name: string,
        type: WeaponType,
        stats: WeaponStats,
        splashRadius: number,
        splashDamage: number
    ) {
        super(name, type, stats);
        this.splashRadius = splashRadius;
        this.splashDamage = splashDamage;
    }

    public calculateDamageAtPoint(directHit: boolean, distance: number): number {
        if (directHit) return this.getStats().damage;
        
        if (distance > this.splashRadius) return 0;
        
        const falloff = 1 - (distance / this.splashRadius);
        return this.splashDamage * falloff;
    }
}

export class MeleeWeapon extends Weapon {
    private quickAttackDamage: number;
    private heavyAttackDamage: number;
    private heavyAttackDelay: number;

    constructor(
        name: string,
        quickDamage: number,
        heavyDamage: number,
        heavyDelay: number = 1000
    ) {
        super(name, WeaponType.MELEE, {
            damage: quickDamage,
            rateOfFire: 120,
            magazineSize: Infinity,
            reloadTime: 0,
            accuracy: 1,
            range: 2
        });
        this.quickAttackDamage = quickDamage;
        this.heavyAttackDamage = heavyDamage;
        this.heavyAttackDelay = heavyDelay;
    }

    public quickAttack(): number {
        return this.quickAttackDamage;
    }

    public heavyAttack(): number {
        return this.heavyAttackDamage;
    }
} 