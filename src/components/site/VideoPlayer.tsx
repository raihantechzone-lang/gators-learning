import { useEffect, useRef, useState } from 'react';
import { Play } from 'lucide-react';
import { parseYouTubeId } from '@/lib/youtube';
import { Button } from '@/components/ui/button';
import { createVideoControls, type VideoControls } from '@/lib/video-controls.js';

export interface VideoPlayerProps {
  youtubeId?: string; videoUrl?: string; title?: string; startSeconds?: number;
  subtitlesUrl?: string; watermark?: string; thumbnail?: string;
  onProgress?: (seconds: number, duration: number) => void;
  onEnded?: () => void; readyToPlay?: boolean;
  seekRequest?: { seconds: number; key: number } | null;
}

export function VideoPlayer({ youtubeId, videoUrl, title, startSeconds = 0, subtitlesUrl, thumbnail,
  onProgress, onEnded, readyToPlay = true, seekRequest }: VideoPlayerProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<VideoControls | null>(null);
  const mediaRef = useRef<HTMLVideoElement | HTMLIFrameElement | null>(null);
  const pendingSeek = useRef<number | null>(null);
  const startAt = useRef(0);
  const callbacks = useRef({ onProgress, onEnded });
  callbacks.current = { onProgress, onEnded };
  const id = parseYouTubeId(youtubeId);
  const [started, setStarted] = useState(false);
  const [fallback, setFallback] = useState(false);
  useEffect(() => { setStarted(false); setFallback(false); pendingSeek.current = null; }, [id, videoUrl]);
  const begin = (seconds: number) => { startAt.current = Math.max(0, seconds); setStarted(true); };

  useEffect(() => {
    if (!seekRequest || !readyToPlay || (!id && !videoUrl)) return;
    const seconds = Math.max(0, seekRequest.seconds);
    wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    if (!started) { pendingSeek.current = seconds; begin(seconds); }
    else if (playerRef.current) { playerRef.current.currentTime = seconds; void playerRef.current.play()?.catch(() => {}); }
    else if (mediaRef.current instanceof HTMLVideoElement) { mediaRef.current.currentTime = seconds; void mediaRef.current.play().catch(() => {}); }
    else pendingSeek.current = seconds;
  }, [seekRequest?.key, readyToPlay]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!started || !mount || (!id && !videoUrl)) return;
    let cancelled = false;
    let player: VideoControls | null = null;
    const media = id ? document.createElement('iframe') : document.createElement('video');
    media.className = 'absolute inset-0 w-full h-full border-0';
    if (media instanceof HTMLIFrameElement) {
      media.src = `https://www.youtube.com/embed/${id}?controls=1&playsinline=1&rel=0&autoplay=1&enablejsapi=1&start=${Math.floor(startAt.current)}&origin=${encodeURIComponent(location.origin)}`;
      media.title = title || 'Course video'; media.allowFullscreen = true;
      media.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
      media.referrerPolicy = 'strict-origin-when-cross-origin';
    } else {
      media.src = videoUrl || ''; media.controls = true; media.autoplay = true; media.playsInline = true;
      media.addEventListener('loadedmetadata', () => { media.currentTime = pendingSeek.current ?? startAt.current; });
      if (subtitlesUrl) { const track = document.createElement('track'); track.kind = 'subtitles'; track.src = subtitlesUrl; track.srclang = 'en'; track.label = 'Subtitles'; media.appendChild(track); }
    }
    mediaRef.current = media; mount.replaceChildren(media);
    const nativeProgress = () => { if (media instanceof HTMLVideoElement) callbacks.current.onProgress?.(media.currentTime, media.duration); };
    const nativeEnded = () => callbacks.current.onEnded?.();
    const useNative = () => {
      if (cancelled) return;
      setFallback(true);
      if (media instanceof HTMLVideoElement) {
        media.controls = true; media.addEventListener('timeupdate', nativeProgress); media.addEventListener('ended', nativeEnded);
      }
    };
    void createVideoControls(media, {
      title, startSeconds: startAt.current, cancelled: () => cancelled,
      onReady: (readyPlayer) => {
        if (cancelled) return;
        playerRef.current = readyPlayer;
        if (pendingSeek.current !== null) { readyPlayer.currentTime = pendingSeek.current; pendingSeek.current = null; }
      },
      onProgress: (seconds, duration) => callbacks.current.onProgress?.(seconds, duration),
      onEnded: () => callbacks.current.onEnded?.(),
    }).then((created) => { if (cancelled) created?.destroy(); else player = created; }).catch(useNative);
    return () => {
      cancelled = true; playerRef.current = null; mediaRef.current = null;
      player?.destroy(); media.removeEventListener('timeupdate', nativeProgress); media.removeEventListener('ended', nativeEnded);
      mount.replaceChildren();
    };
  }, [id, videoUrl, started]);

  return <div ref={wrapRef} className="relative w-full aspect-video overflow-hidden rounded-lg bg-ink">
    {!started ? <Button variant="ghost" type="button" disabled={!readyToPlay} onClick={() => begin(startSeconds)} aria-label={`Play ${title || 'video'}`} className="group absolute inset-0 w-full h-full p-0">
      {(thumbnail || id) && <img src={thumbnail || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt={title || 'Video thumbnail'} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { if (id) e.currentTarget.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`; }} />}
      <span className="absolute inset-0 flex items-center justify-center bg-ink/20 group-hover:bg-ink/30 transition">
        <span className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-background/95 text-brand flex items-center justify-center shadow-xl group-hover:scale-110 transition"><Play className="size-8" fill="currentColor" /></span>
      </span>
    </Button> : !id && !videoUrl ? <div role="status" className="absolute inset-0 flex items-center justify-center text-background font-bold px-6">Recorded video coming soon</div> : <div ref={mountRef} className="absolute inset-0 w-full h-full" />}
    {fallback && <span role="status" className="absolute top-2 left-2 text-xs bg-ink text-background px-2 py-1">সাধারণ প্লেয়ার চালু আছে</span>}
  </div>;
}
