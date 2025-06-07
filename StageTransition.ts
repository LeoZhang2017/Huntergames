import { Timer } from './stage2/Timer';
import { STAGE_ONE_DURATION, STAGE_TWO_DURATION } from './stage2/config';

export enum GameStage {
    STAGE_ONE = 'STAGE_ONE',
    STAGE_TWO = 'STAGE_TWO',
    STAGE_THREE = 'STAGE_THREE'
}

export class StageTransition {
    private currentStage: GameStage;
    private timer: Timer;
    private isTransitioning: boolean;

    constructor() {
        this.currentStage = GameStage.STAGE_ONE;
        this.timer = new Timer(STAGE_ONE_DURATION); // Start with 1-minute timer for Stage 1
        this.isTransitioning = false;
    }

    public update(): void {
        if (this.isTransitioning) return;

        if (this.timer.isTimeUp()) {
            this.handleStageTransition();
        }
    }

    private handleStageTransition(): void {
        this.isTransitioning = true;

        switch (this.currentStage) {
            case GameStage.STAGE_ONE:
                this.transitionToStageTwo();
                break;
            case GameStage.STAGE_TWO:
                this.transitionToStageThree();
                break;
            default:
                break;
        }
    }

    private transitionToStageTwo(): void {
        // Save player's state from Stage 1
        this.savePlayerState();
        
        // Reset timer for Stage 2
        this.timer.reset(STAGE_TWO_DURATION);
        
        // Update current stage
        this.currentStage = GameStage.STAGE_TWO;
        
        // Trigger teleportation effect
        this.startTeleportEffect(() => {
            // Initialize Stage 2
            this.initializeStageTwo();
            this.isTransitioning = false;
        });
    }

    private transitionToStageThree(): void {
        this.currentStage = GameStage.STAGE_THREE;
        // Similar implementation for Stage 3 transition
    }

    private savePlayerState(): void {
        // Save relevant player data (weapons, health, etc.)
        const playerState = {
            weapons: this.getCurrentWeapons(),
            health: this.getCurrentHealth(),
            inventory: this.getCurrentInventory()
        };
        localStorage.setItem('playerState', JSON.stringify(playerState));
    }

    private getCurrentWeapons(): any[] {
        // Implement getting current weapons
        return [];
    }

    private getCurrentHealth(): number {
        // Implement getting current health
        return 100;
    }

    private getCurrentInventory(): any[] {
        // Implement getting current inventory
        return [];
    }

    private startTeleportEffect(callback: () => void): void {
        // Create visual teleport effect
        const teleportOverlay = document.createElement('div');
        teleportOverlay.style.position = 'fixed';
        teleportOverlay.style.top = '0';
        teleportOverlay.style.left = '0';
        teleportOverlay.style.width = '100%';
        teleportOverlay.style.height = '100%';
        teleportOverlay.style.backgroundColor = 'black';
        teleportOverlay.style.opacity = '0';
        teleportOverlay.style.transition = 'opacity 1s ease-in-out';
        teleportOverlay.style.zIndex = '1000';

        document.body.appendChild(teleportOverlay);

        // Fade in
        setTimeout(() => {
            teleportOverlay.style.opacity = '1';
        }, 100);

        // Trigger callback after fade
        setTimeout(() => {
            callback();
            // Fade out
            teleportOverlay.style.opacity = '0';
            // Remove overlay after fade out
            setTimeout(() => {
                document.body.removeChild(teleportOverlay);
            }, 1000);
        }, 1500);
    }

    private initializeStageTwo(): void {
        // Load saved player state
        const playerState = JSON.parse(localStorage.getItem('playerState') || '{}');
        
        // Initialize Stage 2 environment
        this.setupStageTwoEnvironment();
        
        // Restore player state
        this.restorePlayerState(playerState);
    }

    private setupStageTwoEnvironment(): void {
        // Set up the Stage 2 environment
        // This would include:
        // - Loading the new map
        // - Setting up team bases
        // - Initializing resource points
        // - Setting up team spawns
    }

    private restorePlayerState(playerState: any): void {
        // Restore player's weapons, health, and inventory
        if (playerState.weapons) {
            // Restore weapons
        }
        if (playerState.health) {
            // Restore health
        }
        if (playerState.inventory) {
            // Restore inventory
        }
    }

    public getCurrentStage(): GameStage {
        return this.currentStage;
    }

    public getRemainingTime(): string {
        return this.timer.getRemainingTimeFormatted();
    }

    public pauseTimer(): void {
        this.timer.pause();
    }

    public resumeTimer(): void {
        this.timer.resume();
    }
} 