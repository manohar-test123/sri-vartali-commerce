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
 */

type Upload = { name: string; progress: number; error?: string };

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
  const [order, setOrder] = useState<ProductMediaRow[]>(media);
  const [primaryId, setPrimaryId] = useState<string | null>(
    media.find((m) => m.is_primary)?.id ?? media[0]?.id ?? null,
  );
  const dragIndex = useRef<number | null>(null);
  const [urlValue, setUrlValue] = useState("");

  async function persistOrder(nextOrder: ProductMediaRow[], nextPrimary: string | null) {
    setOrder(nextOrder);
    setPrimaryId(nextPrimary);
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
    const next = [...order];
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

  function uploadOne(file: File, index: number): Promise<void> {
    return new Promise((resolve) => {
      sign()
        .then((signature) => {
          if (!signature.configured) {
            throw new Error(
              "Cloudinary isn't configured yet (Settings → Integrations) — use “Add by URL” below.",
            );
          }
          const form = new FormData();
          form.append("file", file);
          form.append("api_key", signature.apiKey!);
          form.append("timestamp", signature.timestamp!);
          form.append("folder", signature.folder!);
          form.append("signature", signature.signature!);

          const xhr = new XMLHttpRequest();
          xhr.open("POST", `https://api.cloudinary.com/v1_1/${signature.cloudName}/image/upload`);
          xhr.upload.onprogress = (event) => {
            if (!event.lengthComputable) return;
            const progress = Math.round((event.loaded / event.total) * 100);
            setUploads((prev) => prev.map((u, i) => (i === index ? { ...u, progress } : u)));
          };
          xhr.onload = async () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              const body = JSON.parse(xhr.responseText) as {
                secure_url: string;
                public_id: string;
              };
              const result = await addMedia(productId, {
                url: body.secure_url,
                cloudinaryPublicId: body.public_id,
              });
              if (!result.ok) {
                setUploads((prev) =>
                  prev.map((u, i) => (i === index ? { ...u, error: result.error } : u)),
                );
              }
            } else {
              setUploads((prev) =>
                prev.map((u, i) => (i === index ? { ...u, error: `HTTP ${xhr.status}` } : u)),
              );
            }
            resolve();
          };
          xhr.onerror = () => {
            setUploads((prev) =>
              prev.map((u, i) => (i === index ? { ...u, error: "network error" } : u)),
            );
            resolve();
          };
          xhr.send(form);
        })
        .catch((error: unknown) => {
          setUploads((prev) =>
            prev.map((u, i) =>
              i === index ? { ...u, error: (error as Error).message } : u,
            ),
          );
          resolve();
        });
    });
  }

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const startIndex = uploads.length;
    setUploads((prev) => [
      ...prev,
      ...Array.from(files).map((f) => ({ name: f.name, progress: 0 })),
    ]);
    for (let i = 0; i < files.length; i++) {
      await uploadOne(files[i], startIndex + i);
    }
    setUploads((prev) => prev.filter((u) => !u.error));
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
    const next = order.filter((m) => m.id !== mediaId);
    setOrder(next);
    setPrimaryId(next.find((m) => m.is_primary)?.id ?? next[0]?.id ?? null);
    router.refresh();
  }

  return (
    <div>
      {notice ? (
        <p className="mb-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-800">{notice}</p>
      ) : null}

      <div className="flex flex-wrap gap-3">
        {order.map((m, index) => (
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
                  onClick={() => persistOrder(order, m.id)}
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

        {uploads.map((u, i) => (
          <div
            key={`${u.name}-${i}`}
            className="flex h-44 w-36 flex-col items-center justify-center rounded-xl border border-wine-900/15 bg-white p-2 text-center text-[11px]"
          >
            {u.error ? (
              <>
                <span className="text-red-700">{u.name}</span>
                <span className="mt-1 text-red-700/80">{u.error}</span>
              </>
            ) : (
              <>
                <span className="truncate text-wine-900/70">{u.name}</span>
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
          className="flex h-44 w-36 flex-col items-center justify-center rounded-xl border border-dashed border-wine-900/25 text-sm text-wine-900/60 hover:border-gold-500 hover:text-wine-900"
        >
          + Upload
          <span className="mt-1 text-[11px] text-wine-900/40">drag cards to reorder</span>
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
