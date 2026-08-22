"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, Square, Trash2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function VoiceRecorder({
  onRecorded,
  disabled,
}: {
  onRecorded: (blob: Blob, durationMs: number) => void;
  disabled?: boolean;
}) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [audioLevels, setAudioLevels] = useState<number[]>([20, 30, 40, 25, 60, 45, 30, 20]);
  
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startedAtRef = useRef(0);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => {
      setSeconds(Math.floor((Date.now() - startedAtRef.current) / 1000));
    }, 250);
    return () => clearInterval(t);
  }, [recording]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stream.getTracks().forEach((t) => t.stop());
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current && audioContextRef.current.state !== "closed") {
        audioContextRef.current.close().catch(() => {});
      }
    };
  }, []);

  async function start() {
    setError(null);
    if (typeof MediaRecorder === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("This browser can't record audio.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];
      recorder.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      recorder.onstop = () => {
        const durationMs = Date.now() - startedAtRef.current;
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (blob.size) onRecorded(blob, durationMs);
      };

      // Set up real-time audio analyser for waveform
      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        const audioCtx = new AudioContextClass();
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 64;
        const source = audioCtx.createMediaStreamSource(stream);
        source.connect(analyser);
        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;

        const dataArray = new Uint8Array(analyser.frequencyBinCount);
        const updateWaves = () => {
          if (!analyserRef.current) return;
          analyserRef.current.getByteFrequencyData(dataArray);
          const levels: number[] = [];
          const step = Math.floor(dataArray.length / 8);
          for (let i = 0; i < 8; i++) {
            const val = dataArray[i * step] || 0;
            const pct = Math.max(15, Math.min(100, Math.round((val / 255) * 100)));
            levels.push(pct);
          }
          setAudioLevels(levels);
          animFrameRef.current = requestAnimationFrame(updateWaves);
        };
        updateWaves();
      } catch {
        // Fallback to synthetic wave animation if Web Audio is blocked
      }

      startedAtRef.current = Date.now();
      recorder.start();
      recorderRef.current = recorder;
      setSeconds(0);
      setRecording(true);
    } catch {
      setError("Microphone access was blocked.");
    }
  }

  function stop(keep: boolean) {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    if (audioContextRef.current && audioContextRef.current.state !== "closed") {
      audioContextRef.current.close().catch(() => {});
      audioContextRef.current = null;
    }
    const recorder = recorderRef.current;
    if (!recorder) return;
    if (!keep) recorder.onstop = () => recorder.stream.getTracks().forEach((t) => t.stop());
    recorder.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  return (
    <div className="flex items-center gap-2">
      {!recording ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={start}
          disabled={disabled}
          className="h-8 rounded-xl border-zinc-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.03] text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-white text-[12.5px]"
        >
          <Mic className="size-3.5 mr-1 text-amber-500" /> Record audio
        </Button>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 dark:bg-rose-500/10 px-3 py-1.5 shadow-xs animate-in fade-in zoom-in-95">
          {/* Pulsing indicator + Timer */}
          <div className="flex items-center gap-2">
            <span className="relative flex size-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
              <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
            </span>
            <span className="text-[13px] font-mono font-semibold text-rose-600 dark:text-rose-400 tabular-nums">
              {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
            </span>
          </div>

          {/* Live Waveform Bars */}
          <div className="flex h-5 items-center gap-1 px-1">
            {audioLevels.map((lvl, idx) => (
              <motion.div
                key={idx}
                animate={{ height: `${lvl}%` }}
                transition={{ duration: 0.08, ease: "linear" }}
                className="w-1 min-h-[4px] rounded-full bg-rose-500/80 dark:bg-rose-400"
              />
            ))}
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-1 pl-1">
            <Button
              type="button"
              size="sm"
              onClick={() => stop(true)}
              className="h-7 rounded-lg bg-rose-600 hover:bg-rose-700 text-white px-2.5 text-[12px] font-medium shadow-xs"
              title="Save recording"
            >
              <Check className="size-3.5 mr-1" /> Done
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => stop(false)}
              className="h-7 w-7 p-0 rounded-lg text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10"
              title="Discard recording"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      )}
      {error && <span className="text-[12px] text-rose-500 dark:text-rose-400">{error}</span>}
    </div>
  );
}
