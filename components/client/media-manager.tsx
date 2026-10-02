"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import {
  addMedia,
  deleteMedia,
  saveMediaOrder,
  setMediaAlt,
} from "@/lib/catalog/actions";
import type { ProductMediaRow } from "@/lib/catalog/types";

/**
 * Product photos (§15B): multi-upload with progress, drag-to-reorder,
 * primary selection, alt text, delete, retry. Uploads go browser →
 * Cloudinary with a server-signed payload (rule 13 analog); when
 * Cloudinary isn't configured, images can be added by URL.
 *
 * The card grid is derived straight from the `media` prop (server truth):
 * every mutation persists then router.refresh()es, so images appear
 * without a manual reload and nothing can go stale in local state.
 */

type Upload = { id: number; file: File; progress: number; error?: string };

let uploadSeq = 0;

export function MediaManager({
  productId,
  productCode,
  media,
}: {
  productId: string;
  productCode: string;
  media: ProductMediaRow[];
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const [urlValue, setUrlValue] = useState("");

  const primaryId = media.find((m) => m.is_primary)?.id ?? media[0]?.id ?? null;

  async function persistOrder(nextOrder: ProductMediaRow[], nextPrimary: string | null) {
    const result = await saveMediaOrder(
      productId,
      nextOrder.map((m) => m.id),
      nextPrimary,
    );
    if (!result.ok) setNotice(result.error);
    else router.refresh();
  }

  function onDrop(index: number) {
    const from = dragIndex.current;
    dragIndex.current = null;
    if (from === null || from === index) return;
    const next = [...media];
    const [moved] = next.splice(from, 1);
    next.splice(index, 0, moved);
    void persistOrder(next, primaryId ?? next[0]?.id ?? null);
  }

  async function sign() {
    const response = await fetch("/api/client/media/signature", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productCode }),
    });
    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      throw new Error(body.error ?? "Could not sign upload.");
    }
    return (await response.json()) as {
      configured: boolean;
      cloudName?: string;
      apiKey?: string;
      folder?: string;
      timestamp?: string;
      signature?: string;
    };
  }

  function patchUpload(id: number, patch: Partial<Upload>) {
    setUploads((prev) => prev.map((u) => (u.id === id ? { ...u, ...patch } : u)));
  }

  // §15B: a failed upload stays on screen with a Retry — it never just
  // vanishes. Success removes the card once the row is persisted.
  async function uploadOne(entry: Upload): Promise<void> {
    patchUpload(entry.id, { error: undefined, progress: 0 });
    try {
      const signature = await sign();
      if (!signature.configured) {
        throw new Error(
          "Cloudinary isn't configured yet (Settings → Integrations) — use “Add by URL” below.",
        );
      }
      const form = new FormData();
      form.append("file", entry.file);
      form.append("api_key", signature.apiKey!);
      form.append("timestamp", signature.timestamp!);
      form.append("folder", signature.folder!);
      form.append("signature", signature.signature!);

      const body = await new Promise<{ secure_url: string; public_id: string }>(
        (resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open(
            "POST",
            `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`,
          );
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            patchUpload(entry.id, {
              progress: Math.round((event.loaded / event.total) * 100),
            });
          };
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`HTTP ${xhr.status}`));
            }
          };
          xhr.onerror = () => reject(new Error("network error"));
          xhr.send(form);
        },
      );

      const result = await addMedia(productId, {
        url: body.secure_url,
        cloudinaryPublicId: body.public_id,
      });
      if (!result.ok) {
        patchUpload(entry.id, { error: result.error });
        return;
      }
      setUploads((prev) => prev.filter((u) => u.id !== entry.id));
    } catch (error) {
      patchUpload(entry.id, { error: (error as Error).message });
    }
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const entries: Upload[] = Array.from(files).map((file) => ({
      id: ++uploadSeq,
      file,
      progress: 0,
    }));
    setUploads((prev) => [...prev, ...entries]);
    await Promise.all(entries.map((entry) => uploadOne(entry)));
    router.refresh();
  }

  async function addByUrl() {
    const url = urlValue.trim();
    if (url === "") return;
    const result = await addMedia(productId, { url });
    if (result.ok) {
      setUrlValue("");
      router.refresh();
    } else {
      setNotice(result.error);
    }
  }

  async function remove(mediaId: string) {
    const result = await deleteMedia(productId, mediaId);
    if (!result.ok) {
    setNotice(result.error);
    return;
  }
  router.refresh();
}

  return (
    <div>
      {notice ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{notice}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {media.map((m, index) => (
          <div
            key={m.id}
            draggable
            onDragStart={() => (dragIndex.current = index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => onDrop(index)}
            className={`w-36 rounded-xl border p-2 ${
              m.id === primaryId ? "border-gold-500 bg-gold-50" : "border-wine-900/15 bg-white"
            }`}
          >
            <div className="relative h-28 overflow-hidden rounded-lg bg-wine-900/5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={m.url} alt={m.alt ?? ""} className="h-full w-full object-cover" />
              {m.id === primaryId ? (
                <span className="absolute left-1 top-1 rounded-full bg-gold-500 px-2 py-0.5 text-[10px] font-bold text-wine-900">
                  PRIMARY
                </span>
              ) : null}
            </div>
            <input
              defaultValue={m.alt ?? ""}
              placeholder="alt text"
              onBlur={async (e) => {
                if (e.target.value !== (m.alt ?? "")) {
                  await setMediaAlt(productId, m.id, e.target.value);
                  router.refresh();
                }
              }}
              className="mt-2 w-full rounded-md border border-wine-900/10 px-1.5 py-1 text-[11px]"
            />
            <div className="mt-1 flex justify-between text-[11px]">
              {m.id === primaryId ? (
                <span className="text-wine-900/40">primary</span>
              ) : (
                <button
                  type="button"
                  className="text-wine-900/70 hover:underline"
                  onClick={() => persistOrder(media, m.id)}
                >
                  make primary
                </button>
              )}
              <button
                type="button"
                className="text-red-700/70 hover:underline"
                onClick={() => remove(m.id)}
              >
                remove
              </button>
            </div>
          </div>
        ))}

        {uploads.map((u) => (
          <div
            key={u.id}
            className="flex h-44 w-36 flex-col items-center justify-center rounded-xl border border-wine-900/15 bg-white p-2 text-center text-[11px]"
          >
            {u.error ? (
              <>
                <span className="truncate text-red-700">{u.file.name}</span>
                <span className="mt-1 text-red-700/80">{u.error}</span>
                <button
                  type="button"
                  className="mt-2 rounded-full border border-red-700/40 px-2.5 py-1 text-[11px] text-red-800 hover:bg-red-50"
                  onClick={() => void uploadOne(u)}
                >
                  Retry
                </button>
              </>
            ) : (
              <>
                <span className="truncate text-wine-900/70">{u.file.name}</span>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-wine-900/10">
                  <div className="h-full bg-gold-500" style={{ width: `${u.progress}%` }} />
                </div>
                <span className="mt-1 text-wine-900/50">{u.progress}%</span>
              </>
            )}
          </div>
        ))}

        <button
          type="button"
          onClick={() => fileInput.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void onFiles(e.dataTransfer.files);
          }}
          className="flex h-44 w-36 flex-col items-center justify-center rounded-xl border border-dashed border-wine-900/25 text-sm text-wine-900/60 hover:border-gold-500 hover:text-wine-900"
        >
          + Upload
          <span className="mt-1 text-[11px] text-wine-900/40">
            drop files here · drag cards to reorder
          </span>
        </button>
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            void onFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      <div className="mt-4 flex gap-2">
        <input
          value={urlValue}
          onChange={(e) => setUrlValue(e.target.value)}
          placeholder="…or add an image by URL"
          className="flex-1 rounded-full border border-wine-900/15 px-3 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={addByUrl}
          className="rounded-full border border-wine-900/20 px-3 py-1.5 text-xs hover:border-gold-500"
        >
          Add by URL
        </button>
      </div>
    </div>
  );
}
