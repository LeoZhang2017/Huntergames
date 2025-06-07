import { StageTransition, GameStage } from './StageTransition';
import { StageUI } from './StageUI';

export class Game {
    private stageTransition: StageTransition;
    private stageUI: StageUI;
    private isGamePaused: boolean;

    constructor() {
        this.stageTransition = new StageTransition();
        this.stageUI = new StageUI();
        this.isGamePaused = false;

        // Initialize event listeners
        this.setupEventListeners();
        
        // Start the game loop
        this.gameLoop();
    }

    private setupEventListeners(): void {
        // Handle pause/resume with ESC key
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.togglePause();
            }
        });
    }

    private togglePause(): void {
        this.isGamePaused = !this.isGamePaused;
        
        if (this.isGamePaused) {
            this.stageTransition.pauseTimer();
            this.stageUI.showTransitionMessage('Game Paused');
        } else {
            this.stageTransition.resumeTimer();
            this.stageUI.showTransitionMessage('Game Resumed');
        }
    }

    private gameLoop(): void {
        if (!this.isGamePaused) {
            // Update stage transition logic
            this.stageTransition.update();

            // Update UI
            const currentStage = this.stageTransition.getCurrentStage();
            this.stageUI.updateStage(currentStage);
            this.stageUI.updateTimer(this.stageTransition.getRemainingTime());

            // Handle stage-specific updates
            this.updateCurrentStage(currentStage);
        }

        // Continue the game loop
        requestAnimationFrame(() => this.gameLoop());
    }

    private updateCurrentStage(stage: GameStage): void {
        switch (stage) {
            case GameStage.STAGE_ONE:
                this.updateStageOne();
                break;
            case GameStage.STAGE_TWO:
                this.updateStageTwo();
                break;
            case GameStage.STAGE_THREE:
                this.updateStageThree();
                break;
        }
    }

    private updateStageOne(): void {
        // Update Stage 1 specific logic
        // - Player movement
        // - Weapon collection
        // - Enemy AI
        // etc.
    }

    private updateStageTwo(): void {
        // Update Stage 2 specific logic
        // - Team-based combat
        // - Resource management
        // - Base control
        // etc.
    }

    private updateStageThree(): void {
        // Update Stage 3 specific logic
        // - Boss fight mechanics
        // - Special weapons
        // - Environmental hazards
        // etc.
    }
}

// Initialize the game when the window loads
window.addEventListener('load', () => {
    new Game();
}); 