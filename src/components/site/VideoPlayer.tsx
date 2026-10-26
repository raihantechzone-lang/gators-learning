import { useEffect, useRef, useState } from "react";
import { parseYouTubeId } from "@/lib/youtube";
import { Button } from "@/components/ui/button";

export interface VideoPlayerProps {
  youtubeId?: string;
  videoUrl?: string;
  title?: string;
  startSeconds?: number;
  subtitlesUrl?: string;
  watermark?: string;
  thumbnail?: string;
  onProgress?: (seconds: number, duration: number) => void;
  onEnded?: () => void;
  readyToPlay?: boolean;
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
  thumbnail,
  onProgress,
  onEnded,
  readyToPlay = true,
}: VideoPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const callbacks = useRef({ onProgress, onEnded, startSeconds });
  callbacks.current = { onProgress, onEnded, startSeconds };
  const id = parseYouTubeId(youtubeId);
  // Thumbnail shows first; the player replaces it in place after the play click.
  const [started, setStarted] = useState(false);
  useEffect(() => setStarted(false), [id, videoUrl]);

  // The native iframe renders immediately; the API only adds resume and progress.
  useEffect(() => {
    if (!id || !started) return;
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
  }, [id, started]);

  return (
    <div className="relative w-full aspect-video overflow-hidden rounded-2xl bg-ink">
      {!started ? (
        <Button variant="ghost" type="button" disabled={!readyToPlay} onClick={() => setStarted(true)} aria-label={`Play ${title || "video"}`} className="group absolute inset-0 w-full h-full p-0">
          {(thumbnail || id) && <img
            src={thumbnail || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "")}
            alt={title || "Video thumbnail"}
            className="absolute inset-0 w-full h-full object-cover"
            onError={(e) => { if (id) e.currentTarget.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }}
          />}
          <span className="absolute inset-0 flex items-center justify-center bg-ink/20 group-hover:bg-ink/30 transition">
            <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-background/95 text-brand flex items-center justify-center shadow-xl group-hover:scale-110 transition text-2xl pl-1">▶</span>
          </span>
        </Button>
      ) : id ? (
        <iframe
          key={id}
          ref={iframeRef}
          className="absolute inset-0 w-full h-full border-0"
          src={`https://www.youtube.com/embed/${id}?controls=1&playsinline=1&rel=0&autoplay=1&enablejsapi=1${startSeconds > 0 ? `&start=${Math.floor(startSeconds)}` : ""}`}
          title={title || "Course video"}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : !videoUrl ? (
        <div role="status" className="absolute inset-0 flex items-center justify-center text-background font-bold text-center px-6">Recorded video coming soon</div>
      ) : (
        <video key={videoUrl} ref={videoRef} autoPlay className="w-full h-full" src={videoUrl} controls playsInline
          onLoadedMetadata={() => { if (videoRef.current) videoRef.current.currentTime = callbacks.current.startSeconds; }}
          onTimeUpdate={(event) => onProgress?.(event.currentTarget.currentTime, event.currentTarget.duration)}
          onEnded={onEnded}>
          {subtitlesUrl && <track kind="subtitles" src={subtitlesUrl} srcLang="en" label="Subtitles" />}
        </video>
      )}
    </div>
  );
}
