export const CONTROL_IDLE_MS = 3000;
export const VIDEO_SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2];

export function videoControlOptions() {
  return {
    controls: ['play-large', 'rewind', 'play', 'fast-forward', 'progress', 'current-time', 'duration', 'mute', 'volume', 'settings', 'fullscreen'],
    settings: ['speed'], speed: { selected: 1, options: [...VIDEO_SPEEDS] }, seekTime: 10,
    hideControls: false, autoplay: true, playsinline: true,
    keyboard: { focused: true, global: false }, storage: { enabled: false },
    iconUrl: '/vendor/plyr.svg', youtube: { noCookie: true, rel: 0, modestbranding: 1, customControls: true },
    fullscreen: { enabled: true, fallback: true, iosNative: true },
  };
}

export async function createVideoControls(media, options = {}) {
  if (!document.querySelector('link[data-gators-player]')) {
    for (const href of ['/vendor/plyr.css', '/video-controls.css']) {
      const link = document.createElement('link'); link.rel = 'stylesheet'; link.href = href;
      link.dataset.gatorsPlayer = ''; document.head.appendChild(link);
    }
  }
  if (!window.Plyr) {
    await new Promise((resolve, reject) => {
      let script = document.querySelector('script[data-gators-player]');
      const existing = Boolean(script);
      if (!script) { script = document.createElement('script'); script.src = '/vendor/plyr.min.js'; script.dataset.gatorsPlayer = ''; }
      const timeout = setTimeout(() => reject(new Error('Player unavailable')), 10000);
      script.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
      script.addEventListener('error', () => { clearTimeout(timeout); script.remove(); reject(new Error('Player unavailable')); }, { once: true });
      if (!existing) document.head.appendChild(script);
    });
  }
  if (!media.isConnected || options.cancelled?.()) return null;
  let target = media;
  if (media.tagName === 'IFRAME') {
    target = document.createElement('div');
    media.replaceWith(target); target.appendChild(media);
  }
  const player = new window.Plyr(target, { ...videoControlOptions(), title: options.title || '' });
  const root = player.elements.container;
  root.classList.add('gators-video');
  const decorate = () => {
  if (root.querySelector('.gators-video__center')) return;
  // YouTube builds its bound buttons asynchronously; decorate only once ready.
  const heading = document.createElement('div');
  heading.className = 'gators-video__heading';
  heading.textContent = options.title || media.title || '';
  root.appendChild(heading);
  const center = document.createElement('div');
  center.className = 'gators-video__center';
  const back = root.querySelector('[data-plyr="rewind"]');
  const play = root.querySelector('.plyr__control--overlaid');
  const forward = root.querySelector('[data-plyr="fast-forward"]');
  for (const [button, label] of [[back, '১০ সেকেন্ড পেছনে'], [play, 'চালু / বিরতি'], [forward, '১০ সেকেন্ড সামনে']]) {
    if (!button) continue;
    button.setAttribute('aria-label', label);
    button.setAttribute('title', label);
    center.appendChild(button);
    if (button !== play) {
      const seconds = document.createElement('span');
      seconds.className = 'gators-video__skip'; seconds.textContent = '10';
      seconds.setAttribute('aria-hidden', 'true'); button.appendChild(seconds);
    }
  }
  if (play) {
    const pause = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    pause.setAttribute('viewBox', '0 0 18 18'); pause.setAttribute('aria-hidden', 'true');
    pause.classList.add('gators-video__pause');
    const bars = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    bars.setAttribute('d', 'M4 3h4v12H4zM10 3h4v12h-4z'); pause.appendChild(bars); play.appendChild(pause);
  }
  root.appendChild(center);
  const settings = root.querySelector('[data-plyr="settings"]');
  const speed = document.createElement('span');
  speed.className = 'gators-video__speed'; speed.textContent = '1×'; speed.setAttribute('aria-hidden', 'true');
  settings?.appendChild(speed);
  settings?.setAttribute('title', 'ভিডিওর গতি');
  player.on('ratechange', () => { speed.textContent = `${player.speed}×`; });
  };
  let timer, destroyed = false;
  const clear = () => clearTimeout(timer);
  const reveal = () => {
    clear(); player.toggleControls(true);
    if (player.playing) timer = setTimeout(() => {
      if (!destroyed && player.playing && !root.querySelector(':focus-visible') && !root.querySelector('.plyr__menu [aria-expanded="true"]')) player.toggleControls(false);
    }, CONTROL_IDLE_MS);
  };
  for (const event of ['pointermove', 'pointerdown', 'touchstart', 'keydown']) root.addEventListener(event, reveal, { passive: true });
  const report = () => {
    const seconds = Number(player.currentTime), duration = Number(player.duration);
    if (Number.isFinite(seconds) && Number.isFinite(duration) && duration > 0) options.onProgress?.(seconds, duration);
  };
  player.on('ready', () => {
    if (destroyed) return;
    decorate();
    const start = options.startSeconds || 0;
    if (start > 0) player.currentTime = start;
    options.onReady?.(player); reveal();
    player.play()?.catch?.(() => { player.toggleControls(true); });
  });
  player.on('play', reveal);
  player.on('pause', () => { clear(); player.toggleControls(true); report(); });
  player.on('timeupdate', report);
  player.on('ended', () => { clear(); player.toggleControls(true); report(); options.onEnded?.(); });
  player.on('error', () => { clear(); options.onError?.(); });
  const originalDestroy = player.destroy.bind(player);
  player.destroy = () => {
    if (destroyed) return;
    report(); destroyed = true; clear();
    for (const event of ['pointermove', 'pointerdown', 'touchstart', 'keydown']) root.removeEventListener(event, reveal);
    originalDestroy();
  };
  return player;
}