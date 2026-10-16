"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { Loader2, Trash2, Upload } from "lucide-react";

import Avatar from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { AVATAR_MAX_EDGE, maxAvatarSizeLabel, validateAvatar } from "@/lib/avatar";

/** Largest source file we will even attempt to decode in the browser. */
const MAX_SOURCE_BYTES = 15_000_000;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("That file could not be read as an image."));
    image.src = src;
  });
}

/**
 * Pick a profile picture.
 *
 * The picture is shrunk in the browser before it is sent, because these bytes
 * end up in a database row: a 4 MB phone photo becomes a small square JPEG.
 * The server still re-checks the type and size, so this step is about keeping
 * rows small rather than about trust.
 */
export default function AvatarUpload({
  userId,
  name,
  hasPicture,
  size = 96,
}: {
  userId: string;
  name?: string | null;
  hasPicture: boolean;
  size?: number;
}) {
  const router = useRouter();
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped after a successful change so the preview is not the cached picture.
  const [version, setVersion] = useState<number | undefined>(undefined);
  const [picture, setPicture] = useState(hasPicture);

  /** Draw the file on a canvas at avatar size and hand back a JPEG blob. */
  async function shrink(file: File): Promise<Blob> {
    const objectUrl = URL.createObjectURL(file);

    try {
      const image = await loadImage(objectUrl);
      const scale = Math.min(1, AVATAR_MAX_EDGE / Math.max(image.width, image.height));
      const width = Math.max(1, Math.round(image.width * scale));
      const height = Math.max(1, Math.round(image.height * scale));

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("Your browser could not process that image.");

      // Flatten onto white: JPEG has no transparency, and a partially
      // transparent PNG would otherwise come out with black edges.
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, width, height);
      context.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.85));
      if (!blob) throw new Error("Your browser could not process that image.");
      return blob;
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  async function handleFile(file: File) {
    setError(null);

    if (!file.type.startsWith("image/")) {
      setError("Choose an image file (JPEG, PNG or WebP).");
      return;
    }
    if (file.size > MAX_SOURCE_BYTES) {
      setError("That image is very large. Please choose one under 15 MB.");
      return;
    }

    setPending(true);

    try {
      const blob = await shrink(file);
      const check = validateAvatar({ mimeType: "image/jpeg", byteSize: blob.size });
      if (!check.ok) throw new Error(check.error);

      const body = new FormData();
      body.append("avatar", new File([blob], "avatar.jpg", { type: "image/jpeg" }));

      const response = await fetch("/api/profile/avatar", { method: "POST", body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "We could not save your picture.");

      setVersion(Date.now());
      setPicture(true);
      push({ title: "Profile picture saved", description: "Your new photo is live.", variant: "success" });
      router.refresh();
    } catch (uploadError) {
      const message = uploadError instanceof Error ? uploadError.message : "We could not save your picture.";
      setError(message);
      push({ title: "Upload failed", description: message, variant: "error" });
    } finally {
      setPending(false);
      // Let the same file be chosen again after a failure.
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    setError(null);
    setPending(true);

    try {
      const response = await fetch("/api/profile/avatar", { method: "DELETE" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data?.error ?? "We could not remove your picture.");

      setVersion(Date.now());
      setPicture(false);
      push({ title: "Profile picture removed", variant: "success" });
      router.refresh();
    } catch (removeError) {
      const message = removeError instanceof Error ? removeError.message : "We could not remove your picture.";
      setError(message);
      push({ title: "Could not remove picture", description: message, variant: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Avatar userId={userId} name={name} version={version} size={size} />

        <div className="space-y-1">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => inputRef.current?.click()}>
              {pending ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Upload className="h-4 w-4" /> {picture ? "Change photo" : "Upload photo"}</>}
            </Button>

            {picture ? (
              <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={remove}>
                <Trash2 className="h-4 w-4" /> Remove
              </Button>
            ) : null}
          </div>
          <p className="text-xs text-[#8A90A6]">
            JPEG, PNG or WebP. We shrink it to {AVATAR_MAX_EDGE}px and store it with your profile, so keep it under {maxAvatarSizeLabel()}.
          </p>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void handleFile(file);
        }}
      />

      {error ? <p role="alert" className="text-sm text-red-600">{error}</p> : null}
    </div>
  );
}
