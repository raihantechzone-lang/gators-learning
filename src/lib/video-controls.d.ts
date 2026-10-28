export const CONTROL_IDLE_MS: number;
export const VIDEO_SPEEDS: number[];
export interface VideoControls {
  currentTime: number; duration: number; speed: number; playing: boolean;
  play(): Promise<void> | undefined; pause(): void; destroy(): void;
}
export function videoControlOptions(): { seekTime: number; speed: { selected: number; options: number[] }; [key: string]: unknown };
export function createVideoControls(media: HTMLVideoElement | HTMLIFrameElement, options?: {
  title?: string; startSeconds?: number; cancelled?: () => boolean;
  onReady?: (player: VideoControls) => void;
  onProgress?: (seconds: number, duration: number) => void;
  onEnded?: () => void; onError?: () => void;
}): Promise<VideoControls | null>;