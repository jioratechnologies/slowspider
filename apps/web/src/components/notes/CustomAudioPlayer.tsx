"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { 
  Download, 
  Pause, 
  Play, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  RotateCw,
  Radio
} from "lucide-react";
import { cn } from "@/lib/utils";

function fmtTime(sec: number): string {
  if (isNaN(sec) || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function CustomAudioPlayer({
  src,
  title,
  durationMs,
}: {
  src: string;
  title?: string;
  durationMs?: number | null;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(durationMs ? durationMs / 1000 : 0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [hoverPct, setHoverPct] = useState<number | null>(null);
  const [liveAmplitudes, setLiveAmplitudes] = useState<number[]>([]);

  const NUM_BARS = 46;

  // Base waveform profile (deterministic based on title/src)
  const baseWaveform = useMemo(() => {
    const bars: number[] = [];
    const seed = (title || src) + "galaxy_eq";
    for (let i = 0; i < NUM_BARS; i++) {
      const char = seed.charCodeAt(i % seed.length);
      const centerFactor = Math.sin((i / NUM_BARS) * Math.PI);
      const randomVariance = ((char * (i + 13)) % 55);
      const height = Math.max(16, Math.min(95, Math.round((centerFactor * 65) + randomVariance * 0.45)));
      bars.push(height);
    }
    return bars;
  }, [title, src]);

  // Audio metadata & end listener
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    function onLoadedMetadata() {
      if (audio?.duration && isFinite(audio.duration)) {
        setDuration(audio.duration);
      }
    }

    function onEnded() {
      setIsPlaying(false);
      setCurrentTime(0);
    }

    audio.addEventListener("loadedmetadata", onLoadedMetadata);
    audio.addEventListener("ended", onEnded);

    return () => {
      audio.removeEventListener("loadedmetadata", onLoadedMetadata);
      audio.removeEventListener("ended", onEnded);
    };
  }, [src]);

  // 60FPS High-frequency Smooth Progress & Live Soundwave Animation Loop
  useEffect(() => {
    if (!isPlaying) {
      setLiveAmplitudes([]);
      return;
    }

    let rafId: number;
    let tick = 0;

    function loop() {
      if (audioRef.current) {
        setCurrentTime(audioRef.current.currentTime);
      }

      tick += 0.12;
      const dynamic = baseWaveform.map((base, idx) => {
        const wave = Math.sin(tick + idx * 0.4) * 18 + Math.cos(tick * 1.5 + idx * 0.25) * 10;
        return Math.max(14, Math.min(100, Math.round(base + wave)));
      });
      setLiveAmplitudes(dynamic);

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [isPlaying, baseWaveform]);

  function togglePlay() {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().then(() => setIsPlaying(true)).catch(() => {});
    }
  }

  function handleSeek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const pct = clickX / rect.width;
    const targetTime = pct * duration;

    audio.currentTime = targetTime;
    setCurrentTime(targetTime);
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverPct((clickX / rect.width) * 100);
  }

  function handleMouseLeave() {
    setHoverPct(null);
  }

  function skip(seconds: number) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    audio.currentTime = Math.max(0, Math.min(duration, audio.currentTime + seconds));
    setCurrentTime(audio.currentTime);
  }

  function cycleSpeed() {
    const speeds = [1, 1.25, 1.5, 2];
    const nextIdx = (speeds.indexOf(playbackRate) + 1) % speeds.length;
    const nextSpeed = speeds[nextIdx];
    setPlaybackRate(nextSpeed);
    if (audioRef.current) audioRef.current.playbackRate = nextSpeed;
  }

  function toggleMute() {
    const audio = audioRef.current;
    if (!audio) return;
    if (isMuted) {
      audio.muted = false;
      setIsMuted(false);
    } else {
      audio.muted = true;
      setIsMuted(true);
    }
  }

  const progressPct = duration > 0 ? Math.max(0, Math.min(100, (currentTime / duration) * 100)) : 0;
  const currentBars = isPlaying && liveAmplitudes.length ? liveAmplitudes : baseWaveform;

  return (
    <div className="relative rounded-2xl border border-[var(--line)] bg-[var(--panel-2)] p-3.5 shadow-sm transition-all hover:border-[var(--line-strong)] select-none">
      <audio ref={audioRef} src={src} preload="metadata" />

      <div className="flex items-center gap-3.5">
        {/* Play/Pause Button */}
        <button
          type="button"
          onClick={togglePlay}
          className={cn(
            "relative flex size-11 shrink-0 items-center justify-center rounded-2xl transition-all duration-200 cursor-pointer shadow-md active:scale-95",
            isPlaying
              ? "bg-gradient-to-tr from-purple-600 to-indigo-500 text-white shadow-purple-500/30 ring-2 ring-purple-400/40"
              : "bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-100"
          )}
          title={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="size-5 fill-current" />
          ) : (
            <Play className="size-5 fill-current ml-0.5" />
          )}
        </button>

        {/* Middle: Frequency Waveform & Track Status */}
        <div className="flex-1 min-w-0 space-y-1.5">
          {/* Top meta row */}
          <div className="flex items-center justify-between text-[11.5px] font-mono">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-zinc-800 dark:text-zinc-200 truncate max-w-[150px] sm:max-w-[200px]">
                {fmtTime(currentTime)} / {fmtTime(duration)}
              </span>
              {isPlaying && (
                <span className="inline-flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                  <Radio className="size-3 animate-pulse text-purple-500" /> Live
                </span>
              )}
            </div>

            {/* Quick action buttons */}
            <div className="flex items-center gap-1 text-zinc-400">
              <button
                type="button"
                onClick={() => skip(-5)}
                className="p-1 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Rewind 5s"
              >
                <RotateCcw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={() => skip(5)}
                className="p-1 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title="Forward 5s"
              >
                <RotateCw className="size-3.5" />
              </button>
              <button
                type="button"
                onClick={cycleSpeed}
                className="rounded-md px-1.5 py-0.5 text-[10.5px] font-bold bg-zinc-200/70 dark:bg-white/[0.08] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-300 dark:hover:bg-white/15 transition-colors cursor-pointer ml-1"
                title="Speed"
              >
                {playbackRate}x
              </button>
              <button
                type="button"
                onClick={toggleMute}
                className="p-1 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                title={isMuted ? "Unmute" : "Mute"}
              >
                {isMuted ? <VolumeX className="size-3.5 text-rose-500" /> : <Volume2 className="size-3.5" />}
              </button>
              <a
                href={src}
                target="_blank"
                rel="noopener noreferrer"
                download={title || "recording.webm"}
                className="p-1 hover:text-purple-600 dark:hover:text-purple-400 transition-colors cursor-pointer"
                title="Download audio"
              >
                <Download className="size-3.5" />
              </a>
            </div>
          </div>

          {/* Continuous Ultra-Smooth Waveform Scrubber (Dual Layer with CSS Clip-Path) */}
          <div
            onClick={handleSeek}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className="group/wave relative h-9 w-full cursor-pointer select-none px-2 rounded-xl bg-zinc-100/80 dark:bg-black/30 border border-zinc-200/60 dark:border-white/[0.05] transition-all hover:border-purple-500/30 overflow-hidden"
            title="Click to seek"
          >
            {/* Layer 1: Background Unplayed Bars */}
            <div className="absolute inset-x-2 inset-y-0 flex items-center gap-[2px] sm:gap-[3px]">
              {currentBars.map((heightPct, i) => (
                <div key={i} className="flex-1 flex items-center justify-center h-full">
                  <span
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[4px] rounded-full bg-zinc-300/80 dark:bg-white/20 transition-[height] duration-75"
                  />
                </div>
              ))}
            </div>

            {/* Layer 2: Hover Highlight Layer */}
            {hoverPct !== null && (
              <div 
                className="absolute inset-x-2 inset-y-0 flex items-center gap-[2px] sm:gap-[3px] pointer-events-none"
                style={{ clipPath: `inset(0 ${Math.max(0, 100 - hoverPct)}% 0 0)` }}
              >
                {currentBars.map((heightPct, i) => (
                  <div key={i} className="flex-1 flex items-center justify-center h-full">
                    <span
                      style={{ height: `${heightPct}%` }}
                      className="w-full max-w-[4px] rounded-full bg-purple-300 dark:bg-purple-900/60 transition-[height] duration-75"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Layer 3: Foreground Played Illuminated Gradient Bars (Smooth Continuous Clip) */}
            <div
              className="absolute inset-x-2 inset-y-0 flex items-center gap-[2px] sm:gap-[3px] pointer-events-none"
              style={{ clipPath: `inset(0 ${Math.max(0, 100 - progressPct)}% 0 0)` }}
            >
              {currentBars.map((heightPct, i) => (
                <div key={i} className="flex-1 flex items-center justify-center h-full">
                  <span
                    style={{ height: `${heightPct}%` }}
                    className="w-full max-w-[4px] rounded-full bg-gradient-to-t from-purple-600 via-indigo-500 to-sky-400 shadow-[0_0_8px_rgba(168,85,247,0.5)] transition-[height] duration-75"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
