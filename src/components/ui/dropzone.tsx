"use client";
import * as React from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";

/**
 * Drag & drop / click / paste (⌘V) image picker.
 */
export function Dropzone({
  onFiles,
  multiple = true,
  busy,
  title = "حط الصور هنا",
  hint = "PNG أو JPG أو WEBP · دوس للاختيار أو الصق بـ ⌘V",
  className,
  compact,
  enablePaste = false,
}: {
  onFiles: (files: File[]) => void | Promise<void>;
  multiple?: boolean;
  busy?: boolean;
  title?: string;
  hint?: string;
  className?: string;
  compact?: boolean;
  enablePaste?: boolean;
}) {
  const [over, setOver] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const accept = React.useCallback(
    (list: FileList | File[] | null) => {
      if (!list) return;
      const files = Array.from(list).filter((f) => f.type.startsWith("image/"));
      if (files.length) onFiles(multiple ? files : files.slice(0, 1));
    },
    [onFiles, multiple],
  );

  React.useEffect(() => {
    if (!enablePaste) return;
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) return;
      const files = Array.from(e.clipboardData?.files ?? []);
      if (files.length) {
        e.preventDefault();
        accept(files);
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [enablePaste, accept]);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        accept(e.dataTransfer.files);
      }}
      className={cn(
        "group flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed text-center transition-all",
        compact ? "gap-1 px-4 py-4" : "gap-2 px-6 py-10",
        over ? "border-primary bg-primary/5 glow-ring" : "border-white/10 hover:border-primary/50 hover:bg-white/[0.02]",
        busy && "pointer-events-none opacity-60",
        className,
      )}
    >
      <input ref={inputRef} type="file" accept={ACCEPT} multiple={multiple} className="hidden" onChange={(e) => { accept(e.target.files); e.target.value = ""; }} />
      <div className={cn("flex items-center justify-center rounded-lg bg-primary/10 text-primary transition group-hover:scale-105", compact ? "h-8 w-8" : "h-11 w-11")}>
        {busy ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
      </div>
      <div className={cn("font-medium", compact ? "text-xs" : "text-sm")}>{busy ? "بيرفع…" : title}</div>
      {!compact && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
