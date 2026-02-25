"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { UploadSimpleIcon, CropIcon } from "@phosphor-icons/react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { useUserStore } from "@/stores/user-store";
import { useTranslations } from "next-intl";

interface AvatarUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AvatarUploadDialog({ open, onOpenChange }: AvatarUploadDialogProps) {
  const t = useTranslations("user");
  const setAvatar = useUserStore((s) => s.setAvatar);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [cropOffset, setCropOffset] = useState({ x: 0, y: 0 });
  const [cropSize, setCropSize] = useState(0);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const reset = useCallback(() => {
    setImageSrc(null);
    setCropOffset({ x: 0, y: 0 });
    setCropSize(0);
  }, []);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setImageSrc(src);
      const img = new Image();
      img.onload = () => {
        imgRef.current = img;
        const minDim = Math.min(img.naturalWidth, img.naturalHeight);
        setNaturalW(img.naturalWidth);
        setNaturalH(img.naturalHeight);
        setCropSize(minDim);
        setCropOffset({
          x: (img.naturalWidth - minDim) / 2,
          y: (img.naturalHeight - minDim) / 2,
        });
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  }, []);

  // Clamp crop offset when values change
  useEffect(() => {
    if (!naturalW || !naturalH || !cropSize) return;
    setCropOffset((prev) => ({
      x: Math.max(0, Math.min(prev.x, naturalW - cropSize)),
      y: Math.max(0, Math.min(prev.y, naturalH - cropSize)),
    }));
  }, [naturalW, naturalH, cropSize]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      setDragging(true);
      setDragStart({ x: e.clientX - cropOffset.x, y: e.clientY - cropOffset.y });
    },
    [cropOffset]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging) return;
      const previewEl = e.currentTarget as HTMLElement;
      const rect = previewEl.getBoundingClientRect();
      const scaleX = naturalW / rect.width;
      const scaleY = naturalH / rect.height;
      const newX = (e.clientX - dragStart.x);
      const newY = (e.clientY - dragStart.y);
      setCropOffset({
        x: Math.max(0, Math.min(newX * scaleX / scaleX, naturalW - cropSize)),
        y: Math.max(0, Math.min(newY * scaleY / scaleY, naturalH - cropSize)),
      });
      setDragStart({ x: e.clientX - newX, y: e.clientY - newY });
    },
    [dragging, dragStart, naturalW, naturalH, cropSize]
  );

  const handleMouseUp = useCallback(() => setDragging(false), []);

  const handleCropAndSave = useCallback(() => {
    if (!imgRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const outputSize = 256;
    canvas.width = outputSize;
    canvas.height = outputSize;

    // Draw circular clip
    ctx.clearRect(0, 0, outputSize, outputSize);
    ctx.beginPath();
    ctx.arc(outputSize / 2, outputSize / 2, outputSize / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    ctx.drawImage(
      imgRef.current,
      cropOffset.x,
      cropOffset.y,
      cropSize,
      cropSize,
      0,
      0,
      outputSize,
      outputSize
    );

    const base64 = canvas.toDataURL("image/png");
    setAvatar(base64);
    reset();
    onOpenChange(false);
  }, [cropOffset, cropSize, setAvatar, reset, onOpenChange]);

  // Preview dimensions
  const previewSize = 280;
  const scale = naturalW ? previewSize / Math.max(naturalW, naturalH) : 1;
  const displayW = naturalW * scale;
  const displayH = naturalH * scale;
  const cropDisplaySize = cropSize * scale;
  const cropDisplayX = cropOffset.x * scale;
  const cropDisplayY = cropOffset.y * scale;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-sm">{t("uploadAvatar")}</DialogTitle>
        </DialogHeader>

        {!imageSrc ? (
          /* Upload zone */
          <label className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-outline-variant/30 bg-surface-variant/10 py-12 transition-colors hover:border-primary/40 hover:bg-primary-container/10">
            <UploadSimpleIcon weight="fill" className="h-10 w-10 text-on-surface-variant/30" />
            <span className="text-xs text-on-surface-variant/50">
              {t("clickToUpload")}
            </span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = "";
              }}
            />
          </label>
        ) : (
          /* Crop view */
          <div className="flex flex-col items-center gap-4">
            <div
              className="relative overflow-hidden rounded-xl bg-black/20"
              style={{ width: displayW, height: displayH }}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageSrc}
                alt="Preview"
                className="pointer-events-none h-full w-full object-contain"
                draggable={false}
              />

              {/* Overlay outside crop */}
              <div className="absolute inset-0 bg-black/50" />

              {/* Crop circle window */}
              <div
                className="absolute rounded-full border-2 border-white/80 shadow-lg"
                style={{
                  width: cropDisplaySize,
                  height: cropDisplaySize,
                  left: cropDisplayX,
                  top: cropDisplayY,
                  background: "transparent",
                  boxShadow: "0 0 0 9999px rgba(0,0,0,0.5)",
                  cursor: dragging ? "grabbing" : "grab",
                }}
              />
            </div>

            {/* Size slider */}
            <div className="flex w-full items-center gap-3 px-2">
              <CropIcon weight="fill" className="h-4 w-4 shrink-0 text-on-surface-variant/50" />
              <input
                type="range"
                min={Math.min(naturalW, naturalH) * 0.2}
                max={Math.min(naturalW, naturalH)}
                value={cropSize}
                onChange={(e) => setCropSize(Number(e.target.value))}
                className="h-1 w-full accent-primary"
              />
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />

        <DialogFooter className="gap-2 sm:gap-2">
          <button
            onClick={() => { reset(); onOpenChange(false); }}
            className="rounded-lg px-4 py-1.5 text-xs text-on-surface-variant transition-colors hover:bg-surface-variant/30"
          >
            {t("cancel")}
          </button>
          {imageSrc && (
            <button
              onClick={handleCropAndSave}
              className="rounded-lg bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {t("save")}
            </button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
