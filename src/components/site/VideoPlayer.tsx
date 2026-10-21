import { useEffect, useRef } from "react";
import { parseYouTubeId } from "@/lib/youtube";

export interface VideoPlayerProps {
  youtubeId?: string;
  videoUrl?: string;
  title?: string;
  startSeconds?: number;
  subtitlesUrl?: string;
  watermark?: string;
  onProgress?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
}

type YouTubePlayer = {
  getCurrentTime: () => number;
  getDuration: () => number;
  seekTo: (seconds: number, allowSeekAhead: boolean) => void;
  destroy: () => void;
};
type YouTubeApi = {
  Player: new (element: HTMLIFrameElement, options: {
    events: {
      onReady: (event: { target: YouTubePlayer }) => void;
      onStateChange: (event: { data: number }) => void;
    };
  }) => YouTubePlayer;
};

export function VideoPlayer({
  youtubeId,
  videoUrl,
  title,
  startSeconds = 0,
  subtitlesUrl,
  onProgress,
  onEnded,
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onProgress, onEnded, startSeconds });
  callbacks.current = { onProgress, onEnded, startSeconds };
  const id = parseYouTubeId(youtubeId);

  // The native iframe renders immediately; the API only adds resume and progress.
  useEffect(() => {
    if (!id) return;
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      document.head.appendChild(script);
    }
    let player: YouTubePlayer | undefined;
    let ready = false;
    let attempts = 0;
    const timer = setInterval(() => {
      const api = (window as Window & { YT?: YouTubeApi }).YT;
      if (!player && api?.Player && iframeRef.current) {
        player = new api.Player(iframeRef.current, {
          events: {
            onReady: ({ target }) => {
              ready = true;
              if (callbacks.current.startSeconds > 0) target.seekTo(callbacks.current.startSeconds, true);
            },
            onStateChange: ({ data }) => {
              if (data === 0) callbacks.current.onEnded?.();
            },
          },
        });
      }
      if (ready && player) {
        const duration = player.getDuration();
        if (duration > 0) callbacks.current.onProgress?.(player.getCurrentTime(), duration);
      }
      attempts += 1;
      if (!player && attempts >= 30) clearInterval(timer);
    }, 1000);
    return () => {
      clearInterval(timer);
      player?.destroy();
    };
  }, [id]);

  if (!id && !videoUrl) {
    return (
      <div className="w-full aspect-video flex items-center justify-center bg-ink rounded-2xl text-background/50 text-sm">
        No video source provided
      </div>
    );
  }

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-ink">
      {id ? (
        <iframe
          key={id}
          ref={iframeRef}
          className="absolute inset-0 w-full h-full border-0"
          src={`https://www.youtube.com/embed/${id}?controls=1&playsinline=1&rel=0&enablejsapi=1`}
          title={title || "Course video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : (
        <video key={videoUrl} ref={videoRef} className="w-full h-full" src={videoUrl} controls playsInline
          onLoadedMetadata={() => { if (videoRef.current) videoRef.current.currentTime = callbacks.current.startSeconds; }}
          onTimeUpdate={(event) => onProgress?.(event.currentTarget.currentTime, event.currentTarget.duration)}
          onEnded={onEnded}>
          {subtitlesUrl && <track kind="subtitles" src={subtitlesUrl} srcLang="en" label="Subtitles" />}
        </video>
      )}
    </div>
  );
}
