import { Weapon, WeaponType, WeaponStats } from './Weapon';
import { BurstWeapon, ShotgunWeapon, ExplosiveWeapon, MeleeWeapon } from './SpecializedWeapons';

export class WeaponFactory {
    private static weaponStats: { [key: string]: WeaponStats } = {
        'AR-1': {
            damage: 25,
            rateOfFire: 600,
            magazineSize: 30,
            reloadTime: 2.5,
            accuracy: 0.85,
            range: 75
        },
        'BR-2': {
            damage: 20,
            rateOfFire: 800,
            magazineSize: 36,
            reloadTime: 2.2,
            accuracy: 0.9,
            range: 85
        },
        'SM-1': {
            damage: 18,
            rateOfFire: 900,
            magazineSize: 35,
            reloadTime: 1.8,
            accuracy: 0.75,
            range: 45
        },
        'SM-2': {
            damage: 20,
            rateOfFire: 750,
            magazineSize: 25,
            reloadTime: 1.5,
            accuracy: 0.8,
            range: 55
        },
        'SG-1': {
            damage: 120,
            rateOfFire: 60,
            magazineSize: 6,
            reloadTime: 0.5,
            accuracy: 0.7,
            range: 20
        },
        'SG-2': {
            damage: 80,
            rateOfFire: 180,
            magazineSize: 8,
            reloadTime: 2.8,
            accuracy: 0.65,
            range: 15
        },
        'P-1': {
            damage: 30,
            rateOfFire: 380,
            magazineSize: 12,
            reloadTime: 1.5,
            accuracy: 0.85,
            range: 40
        },
        'P-2': {
            damage: 45,
            rateOfFire: 150,
            magazineSize: 8,
            reloadTime: 1.8,
            accuracy: 0.9,
            range: 50
        },
        'MP-1': {
            damage: 15,
            rateOfFire: 1000,
            magazineSize: 21,
            reloadTime: 1.6,
            accuracy: 0.75,
            range: 35
        },
        'SR-1': {
            damage: 150,
            rateOfFire: 45,
            magazineSize: 5,
            reloadTime: 3.0,
            accuracy: 1.0,
            range: 100
        },
        'SR-2': {
            damage: 85,
            rateOfFire: 90,
            magazineSize: 10,
            reloadTime: 2.8,
            accuracy: 0.95,
            range: 90
        },
        'RL-1': {
            damage: 120,
            rateOfFire: 30,
            magazineSize: 1,
            reloadTime: 3.5,
            accuracy: 0.9,
            range: 80
        },
        'GL-1': {
            damage: 85,
            rateOfFire: 90,
            magazineSize: 6,
            reloadTime: 3.0,
            accuracy: 0.85,
            range: 60
        }
    };

    private static specialWeaponConfig = {
        'BR-2': {
            type: 'burst',
            burstCount: 3,
            burstDelay: 50
        },
        'MP-1': {
            type: 'burst',
            burstCount: 3,
            burstDelay: 30
        },
        'SG-1': {
            type: 'shotgun',
            pelletCount: 12,
            spreadAngle: 25
        },
        'SG-2': {
            type: 'shotgun',
            pelletCount: 8,
            spreadAngle: 35
        },
        'RL-1': {
            type: 'explosive',
            splashRadius: 3,
            splashDamage: 80
        },
        'GL-1': {
            type: 'explosive',
            splashRadius: 2.5,
            splashDamage: 65
        },
        'COMBAT_KNIFE': {
            type: 'melee',
            quickDamage: 35,
            heavyDamage: 85
        },
        'ENERGY_SWORD': {
            type: 'melee',
            quickDamage: 50,
            heavyDamage: 100
        }
    };

    public static createWeapon(weaponName: string): Weapon | null {
        const stats = this.weaponStats[weaponName];
        if (!stats) return null;

        const specialConfig = this.specialWeaponConfig[weaponName];
        if (!specialConfig) {
            return this.createBasicWeapon(weaponName, stats);
        }

        switch (specialConfig.type) {
            case 'burst':
                return new BurstWeapon(
                    weaponName,
                    stats,
                    specialConfig.burstCount,
                    specialConfig.burstDelay
                );
            case 'shotgun':
                return new ShotgunWeapon(
                    weaponName,
                    stats,
                    specialConfig.pelletCount,
                    specialConfig.spreadAngle
                );
            case 'explosive':
                return new ExplosiveWeapon(
                    weaponName,
                    weaponName.startsWith('RL') ? WeaponType.ROCKET_LAUNCHER : WeaponType.GRENADE_LAUNCHER,
                    stats,
                    specialConfig.splashRadius,
                    specialConfig.splashDamage
                );
            case 'melee':
                return new MeleeWeapon(
                    weaponName,
                    specialConfig.quickDamage,
                    specialConfig.heavyDamage
                );
            default:
                return this.createBasicWeapon(weaponName, stats);
        }
    }

    private static createBasicWeapon(weaponName: string, stats: WeaponStats): Weapon {
        let type: WeaponType;
        switch (weaponName) {
            case 'AR-1':
            case 'BR-2':
                type = WeaponType.ASSAULT_RIFLE;
                break;
            case 'SM-1':
            case 'SM-2':
                type = WeaponType.SMG;
                break;
            case 'SG-1':
            case 'SG-2':
                type = WeaponType.SHOTGUN;
                break;
            case 'P-1':
            case 'P-2':
                type = WeaponType.PISTOL;
                break;
            case 'MP-1':
                type = WeaponType.MACHINE_PISTOL;
                break;
            case 'SR-1':
            case 'SR-2':
                type = WeaponType.SNIPER_RIFLE;
                break;
            case 'RL-1':
                type = WeaponType.ROCKET_LAUNCHER;
                break;
            case 'GL-1':
                type = WeaponType.GRENADE_LAUNCHER;
                break;
            default:
                type = WeaponType.ASSAULT_RIFLE;
        }

        return new Weapon(weaponName, type, stats);
    }
} 