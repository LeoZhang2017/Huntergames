export class Timer {
    private startTime: number;
    private endTime: number;
    private isPaused: boolean;
    private pauseStartTime: number;
    private totalPausedTime: number;

    constructor(durationInSeconds: number) {
        this.startTime = Date.now();
        this.endTime = this.startTime + (durationInSeconds * 1000);
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
    }

    public pause(): void {
        if (!this.isPaused) {
            this.isPaused = true;
            this.pauseStartTime = Date.now();
        }
    }

    public resume(): void {
        if (this.isPaused) {
            this.totalPausedTime += Date.now() - this.pauseStartTime;
            this.isPaused = false;
        }
    }

    public getRemainingTime(): number {
        if (this.isPaused) {
            return Math.max(0, this.endTime - this.pauseStartTime - this.totalPausedTime);
        }
        return Math.max(0, this.endTime - Date.now() - this.totalPausedTime);
    }

    public getRemainingTimeFormatted(): string {
        const remainingMs = this.getRemainingTime();
        const minutes = Math.floor(remainingMs / 60000);
        const seconds = Math.floor((remainingMs % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    public isTimeUp(): boolean {
        return this.getRemainingTime() <= 0;
    }

    public getElapsedTime(): number {
        if (this.isPaused) {
            return this.pauseStartTime - this.startTime - this.totalPausedTime;
        }
        return Date.now() - this.startTime - this.totalPausedTime;
    }

    public getElapsedTimeFormatted(): string {
        const elapsedMs = this.getElapsedTime();
        const minutes = Math.floor(elapsedMs / 60000);
        const seconds = Math.floor((elapsedMs % 60000) / 1000);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }

    public reset(durationInSeconds: number): void {
        this.startTime = Date.now();
        this.endTime = this.startTime + (durationInSeconds * 1000);
        this.isPaused = false;
        this.pauseStartTime = 0;
        this.totalPausedTime = 0;
    }
} 