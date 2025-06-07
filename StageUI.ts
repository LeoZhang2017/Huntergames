export class StageUI {
    private container: HTMLElement;
    private timerElement: HTMLElement;
    private stageElement: HTMLElement;

    constructor() {
        this.createUIElements();
    }

    private createUIElements(): void {
        // Create container
        this.container = document.createElement('div');
        this.container.style.position = 'fixed';
        this.container.style.top = '20px';
        this.container.style.right = '20px';
        this.container.style.padding = '10px';
        this.container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        this.container.style.borderRadius = '5px';
        this.container.style.color = 'white';
        this.container.style.fontFamily = 'Arial, sans-serif';
        this.container.style.zIndex = '100';

        // Create stage display
        this.stageElement = document.createElement('div');
        this.stageElement.style.marginBottom = '5px';
        this.stageElement.style.fontSize = '18px';
        this.stageElement.style.fontWeight = 'bold';
        this.container.appendChild(this.stageElement);

        // Create timer display
        this.timerElement = document.createElement('div');
        this.timerElement.style.fontSize = '24px';
        this.timerElement.style.fontWeight = 'bold';
        this.container.appendChild(this.timerElement);

        // Add to document
        document.body.appendChild(this.container);
    }

    public updateStage(stageName: string): void {
        this.stageElement.textContent = `Stage: ${stageName}`;
    }

    public updateTimer(time: string): void {
        this.timerElement.textContent = time;
        
        // Add warning effect when time is running low (less than 10 seconds)
        const [minutes, seconds] = time.split(':').map(Number);
        if (minutes === 0 && seconds <= 10) {
            this.timerElement.style.color = 'red';
            if (!this.timerElement.style.animation) {
                this.timerElement.style.animation = 'pulse 1s infinite';
            }
        } else {
            this.timerElement.style.color = 'white';
            this.timerElement.style.animation = '';
        }
    }

    public showTransitionMessage(message: string): void {
        const transitionMessage = document.createElement('div');
        transitionMessage.style.position = 'fixed';
        transitionMessage.style.top = '50%';
        transitionMessage.style.left = '50%';
        transitionMessage.style.transform = 'translate(-50%, -50%)';
        transitionMessage.style.padding = '20px';
        transitionMessage.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
        transitionMessage.style.color = 'white';
        transitionMessage.style.borderRadius = '10px';
        transitionMessage.style.fontSize = '24px';
        transitionMessage.style.textAlign = 'center';
        transitionMessage.style.zIndex = '1001';
        transitionMessage.textContent = message;

        document.body.appendChild(transitionMessage);

        setTimeout(() => {
            document.body.removeChild(transitionMessage);
        }, 3000);
    }

    // Add CSS animation for the timer pulse effect
    private addPulseAnimation(): void {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes pulse {
                0% { transform: scale(1); }
                50% { transform: scale(1.1); }
                100% { transform: scale(1); }
            }
        `;
        document.head.appendChild(style);
    }
} 