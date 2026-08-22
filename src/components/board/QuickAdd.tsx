"use client";

import { useState, useRef, useEffect } from "react";
import { Plus, Mic, Video, Link2, Paperclip, Image as ImageIcon, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function QuickAdd({ onAdd }: { onAdd: (title: string, files?: File[]) => void }) {
  const [value, setValue] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const v = value.trim();
    if (!v && attachedFiles.length === 0) return;
    
    // Pass the plain text title, let Board.tsx handle uploading the files as Notes
    if (v || attachedFiles.length > 0) {
      onAdd(v || "Attached Files", attachedFiles);
    }
    
    setValue("");
    setAttachedFiles([]);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setAttachedFiles(prev => [...prev, ...Array.from(e.target.files!)]);
    }
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const triggerFileInput = (accept?: string) => {
    if (fileInputRef.current) {
      if (accept) {
        fileInputRef.current.accept = accept;
      } else {
        fileInputRef.current.removeAttribute('accept');
      }
      fileInputRef.current.click();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    } else {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
          const audioFile = new File([audioBlob], `Audio_Record_${new Date().getTime()}.webm`, { type: 'audio/webm' });
          setAttachedFiles(prev => [...prev, audioFile]);
          setRecordingTime(0);
        };

        mediaRecorder.start();
        setIsRecording(true);
        setRecordingTime(0);
        timerRef.current = setInterval(() => {
          setRecordingTime(prev => prev + 1);
        }, 1000);
      } catch (error) {
        console.error("Error accessing microphone", error);
        alert("Could not access microphone.");
      }
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const hasContent = value.trim().length > 0 || attachedFiles.length > 0;

  return (
    <form
      className={`mb-4 flex items-center gap-2 rounded-2xl border bg-white/90 dark:bg-[#16161a]/85 py-2 pr-2 pl-3.5 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition-all overflow-hidden ${
        isDragging 
          ? "border-zinc-400 bg-zinc-100/80 dark:border-white/40 dark:bg-white/[0.08] ring-2 ring-zinc-400/20 dark:ring-white/20" 
          : "border-zinc-200/90 dark:border-white/[0.08] hover:border-zinc-300 dark:hover:border-white/15 focus-within:border-zinc-400 dark:focus-within:border-white/25 focus-within:bg-white dark:focus-within:bg-[#19191e]"
      }`}
      onSubmit={handleSubmit}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        multiple
        onChange={handleFileChange}
      />
      
      {/* Quick Action Icons */}
      <div className="flex items-center gap-0.5 text-zinc-500 dark:text-zinc-400 shrink-0">
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className={`size-8 rounded-xl transition-colors hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100 ${isRecording ? "text-rose-500 hover:text-rose-600 hover:bg-rose-500/10" : ""}`}
          onClick={toggleRecording}
          title={isRecording ? "Stop Recording" : "Record Audio"}
        >
          {isRecording ? <Square className="size-4 fill-current text-rose-500" /> : <Mic className="size-4" />}
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="size-8 rounded-xl hidden sm:inline-flex text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => triggerFileInput("image/*")}
          title="Add Image"
        >
          <ImageIcon className="size-4" />
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="size-8 rounded-xl hidden sm:inline-flex text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => triggerFileInput("video/*")}
          title="Add Video"
        >
          <Video className="size-4" />
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="size-8 rounded-xl text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => triggerFileInput()}
          title="Add File"
        >
          <Paperclip className="size-4" />
        </Button>
        <Button 
          type="button" 
          variant="ghost" 
          size="icon" 
          className="size-8 rounded-xl hidden sm:inline-flex text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-white/[0.08] hover:text-zinc-900 dark:hover:text-zinc-100"
          onClick={() => {
            if (!value.startsWith("http")) {
              setValue("https://" + value);
            }
          }}
          title="Add Link"
        >
          <Link2 className="size-4" />
        </Button>
      </div>

      <div className="flex flex-1 items-center gap-2 overflow-x-auto hide-scrollbar">
        {attachedFiles.map((file, i) => (
          <div key={i} className="flex items-center gap-1.5 rounded-lg bg-zinc-100 dark:bg-white/[0.06] border border-zinc-200 dark:border-white/10 px-2 py-1 text-xs text-zinc-800 dark:text-zinc-200 whitespace-nowrap">
            <span className="max-w-28 truncate">{file.name}</span>
            <button type="button" onClick={() => removeFile(i)} className="text-zinc-400 hover:text-rose-500">
              <X className="size-3" />
            </button>
          </div>
        ))}

        {isRecording ? (
          <div className="flex items-center gap-3 px-2 py-0.5 animate-in fade-in">
            <div className="flex items-center gap-1.5 text-[13px] font-mono font-semibold text-rose-600 dark:text-rose-400">
              <span className="relative flex size-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-rose-500" />
              </span>
              <span>{formatTime(recordingTime)}</span>
            </div>

            {/* Pulsing Audio Waveform Bars */}
            <div className="flex h-4 items-center gap-0.5">
              {[20, 45, 80, 50, 95, 60, 35, 75, 40, 90, 65, 30].map((h, idx) => (
                <span
                  key={idx}
                  className="w-0.5 rounded-full bg-rose-500/80 dark:bg-rose-400 animate-pulse"
                  style={{
                    height: `${Math.max(4, Math.min(16, (h * 16) / 100))}px`,
                    animationDuration: `${0.3 + (idx % 4) * 0.15}s`,
                  }}
                />
              ))}
            </div>

            <span className="text-[12px] text-zinc-400 dark:text-zinc-500 hidden sm:inline">Click stop to attach audio</span>
          </div>
        ) : (
          <input
            type="text"
            placeholder={isDragging ? "Drop files here..." : attachedFiles.length > 0 ? "Add a description..." : "Add a task and press Enter..."}
            autoComplete="off"
            className="min-w-10 flex-1 border-0 bg-transparent text-[14px] text-zinc-900 dark:text-zinc-100 outline-none placeholder:text-zinc-400 dark:placeholder:text-zinc-500"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
        )}
      </div>
      
      {hasContent && !isRecording && (
        <Button 
          type="submit" 
          size="sm" 
          className="rounded-xl bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white shrink-0 gap-1 px-3.5 h-8 text-[12.5px] shadow-xs transition-all"
        >
          <Plus className="size-3.5" /> Add
        </Button>
      )}
    </form>
  );
}
