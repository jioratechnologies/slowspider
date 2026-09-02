"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  Plus, 
  Mic, 
  Video, 
  Link2, 
  Paperclip, 
  Image as ImageIcon, 
  Pencil,
  Square, 
  X, 
  Sparkles,
  Calendar,
  Clock,
  Folder,
  Tag
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseTaskInput, type ParsedTaskInput } from "@/lib/nlp-parser";
import type { Cluster, Priority } from "@/lib/types";
import { cn } from "@/lib/utils";

export interface TaskCreationMetadata {
  priority?: Priority;
  deadline?: string | null;
  deadline_time?: string | null;
  cluster_id?: number | null;
}

export default function QuickAdd({ 
  onAdd,
  clusters = [],
  onOpenCanvas,
}: { 
  onAdd: (title: string, files?: File[], metadata?: TaskCreationMetadata) => void;
  clusters?: Cluster[];
  onOpenCanvas?: () => void;
}) {
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

  const parsed: ParsedTaskInput = parseTaskInput(value, clusters);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const v = value.trim();
    if (!v && attachedFiles.length === 0) return;
    
    const taskTitle = parsed.cleanTitle || v || "Attached Files";
    const metadata: TaskCreationMetadata = {
      priority: parsed.priority !== "none" ? parsed.priority : undefined,
      deadline: parsed.deadline,
      deadline_time: parsed.deadlineTime,
      cluster_id: parsed.clusterId,
    };

    onAdd(taskTitle, attachedFiles, metadata);
    
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
      fileInputRef.current.accept = accept || "*/*";
      fileInputRef.current.click();
    }
  };

  const toggleRecording = async () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
      setRecordingTime(0);
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
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const audioFile = new File([audioBlob], `Audio_Record_${new Date().toISOString().slice(11, 19).replace(/:/g, "-")}.webm`, { type: "audio/webm" });
          setAttachedFiles(prev => [...prev, audioFile]);
          stream.getTracks().forEach(track => track.stop());
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
    <div className="mb-4">
      <form
        className={cn(
          "flex items-center gap-2.5 rounded-2xl border bg-white dark:bg-[#18181c] px-4 py-2.5 shadow-sm transition-all",
          isDragging 
            ? "border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30" 
            : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20"
        )}
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
        <div className="flex items-center gap-1 text-neutral-400 dark:text-neutral-500 shrink-0">
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className={cn("size-8 rounded-lg hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800", isRecording && "text-rose-500 bg-rose-500/15")}
            onClick={toggleRecording}
            title={isRecording ? "Stop Recording" : "Record Voice Note"}
          >
            {isRecording ? <Square className="size-4.5 fill-current text-rose-500 animate-pulse" /> : <Mic className="size-4.5" />}
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="size-8 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 hidden sm:inline-flex"
            onClick={() => triggerFileInput("image/*")}
            title="Attach Image"
          >
            <ImageIcon className="size-4.5" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="size-8 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 hidden sm:inline-flex"
            onClick={() => triggerFileInput("video/*")}
            title="Attach Video"
          >
            <Video className="size-4.5" />
          </Button>
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="size-8 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            onClick={() => triggerFileInput()}
            title="Attach File"
          >
            <Paperclip className="size-4.5" />
          </Button>
          {onOpenCanvas && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="size-8 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-indigo-500 hover:bg-indigo-500/10 transition-colors"
              onClick={onOpenCanvas}
              title="Draw / Canvas Sketch (Stylus & Apple Pencil supported)"
            >
              <Pencil className="size-4.5 text-indigo-500" />
            </Button>
          )}
          <Button 
            type="button" 
            variant="ghost" 
            size="icon" 
            className="size-8 rounded-lg text-neutral-400 dark:text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 hidden sm:inline-flex"
            onClick={() => {
              if (!value.startsWith("http")) {
                setValue("https://" + value);
              }
            }}
            title="Add Link URL"
          >
            <Link2 className="size-4.5" />
          </Button>
        </div>

        <div className="flex flex-1 items-center gap-2 overflow-x-auto hide-scrollbar">
          {attachedFiles.map((file, i) => (
            <div key={i} className="flex items-center gap-1.5 border border-neutral-300 dark:border-neutral-700 bg-neutral-100 dark:bg-neutral-800/90 px-2.5 py-1 text-xs font-medium text-neutral-900 dark:text-neutral-100 whitespace-nowrap rounded-lg">
              <span className="max-w-32 truncate">{file.name}</span>
              <button type="button" onClick={() => removeFile(i)} className="text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 cursor-pointer">
                <X className="size-3.5" />
              </button>
            </div>
          ))}

          {isRecording ? (
            <div className="flex items-center gap-3 px-2 py-0.5 animate-in fade-in">
              <div className="flex items-center gap-2 text-sm font-mono font-bold text-rose-600 dark:text-rose-400">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-rose-400 opacity-75" />
                  <span className="relative inline-flex size-2.5 rounded-full bg-rose-500" />
                </span>
                <span>{formatTime(recordingTime)}</span>
              </div>

              {/* Pulsing Audio Waveform Bars */}
              <div className="flex h-5 items-center gap-1">
                {[20, 50, 85, 45, 100, 65, 30, 80, 40, 95, 70, 35].map((h, idx) => (
                  <span
                    key={idx}
                    className="w-1 rounded-full bg-rose-500 dark:bg-rose-400 animate-pulse"
                    style={{
                      height: `${Math.max(5, Math.min(20, (h * 20) / 100))}px`,
                      animationDuration: `${0.3 + (idx % 4) * 0.15}s`,
                    }}
                  />
                ))}
              </div>

              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400 hidden sm:inline">Click square to attach audio</span>
            </div>
          ) : (
            <input
              type="text"
              placeholder={
                isDragging
                  ? "Drop files here..."
                  : attachedFiles.length > 0
                  ? "Add a description..."
                  : "Add task (e.g. Deploy API tomorrow #backend !high @15:00)..."
              }
              autoComplete="off"
              className="min-w-10 flex-1 border-0 bg-transparent text-sm sm:text-[15px] font-medium text-neutral-900 dark:text-neutral-100 outline-none placeholder:text-neutral-400 dark:placeholder:text-neutral-500"
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          )}
        </div>
        
        {hasContent && !isRecording && (
          <Button 
            type="submit" 
            size="sm" 
            className="bg-neutral-900 hover:bg-neutral-800 text-white dark:bg-white dark:hover:bg-neutral-100 dark:text-neutral-900 shrink-0 gap-1.5 px-4 h-8 text-xs font-semibold rounded-xl cursor-pointer shadow-xs"
          >
            <Plus className="size-4" /> Add
          </Button>
        )}
      </form>

      {/* Live NLP Token Preview Bar */}
      {parsed.tokens.length > 0 && (
        <div className="mt-2 flex flex-wrap items-center gap-2 px-2 text-xs font-mono font-semibold animate-in fade-in slide-in-from-top-1">
          <span className="text-neutral-500 dark:text-neutral-400 flex items-center gap-1.5 font-bold">
            <Sparkles className="size-3.5 text-amber-500" />
            Detected:
          </span>

          {parsed.clusterName && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-500/15 border border-purple-500/30 px-2.5 py-1 text-purple-700 dark:text-purple-300">
              <Folder className="size-3.5 text-purple-500" />
              #{parsed.clusterName}
            </span>
          )}

          {parsed.priority !== "none" && (
            <span className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 font-bold border",
              parsed.priority === "high"
                ? "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30"
                : parsed.priority === "med"
                ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
                : "bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-500/30"
            )}>
              <Tag className="size-3.5" />
              !{parsed.priority}
            </span>
          )}

          {parsed.deadline && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-1 text-indigo-700 dark:text-indigo-300">
              <Calendar className="size-3.5 text-indigo-500" />
              {parsed.deadline}
            </span>
          )}

          {parsed.deadlineTime && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 text-emerald-700 dark:text-emerald-300">
              <Clock className="size-3.5 text-emerald-500" />
              @{parsed.deadlineTime}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
