import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "node:crypto";
import { z } from "zod";

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
const TIMEOUT_MS = 15_000;

export class StorageError extends Error {
  constructor(
    message: string,
    public status = 502,
  ) {
    super(message);
    this.name = "StorageError";
  }
}

let cached: {
  storage: ReturnType<typeof createClient>["storage"];
  bucket: string;
} | null = null;

function bucket() {
  if (cached) return cached.storage.from(cached.bucket);

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const name = process.env.STORAGE_BUCKET;
  if (!url || !key || !name) {
    throw new StorageError("Bildlagringen är inte konfigurerad.", 500);
  }

  const client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) =>
        fetch(input, {
          ...init,
          signal: init?.signal
            ? AbortSignal.any([init.signal, AbortSignal.timeout(TIMEOUT_MS)])
            : AbortSignal.timeout(TIMEOUT_MS),
        }),
    },
  });
  cached = { storage: client.storage, bucket: name };
  return cached.storage.from(cached.bucket);
}

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

export function detectImageType(
  buf: Buffer,
): { contentType: "image/jpeg" | "image/png"; ext: "jpg" | "png" } | null {
  if (
    buf.length >= 3 &&
    buf[0] === 0xff &&
    buf[1] === 0xd8 &&
    buf[2] === 0xff
  ) {
    return { contentType: "image/jpeg", ext: "jpg" };
  }
  if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIGNATURE)) {
    return { contentType: "image/png", ext: "png" };
  }
  return null;
}

const UploadResult = z.object({ path: z.string().min(1) });
const PublicUrl = z.object({ publicUrl: z.url() });

function toStorageError(err: unknown): StorageError {
  if (err instanceof StorageError) return err;
  const message = (err as { message?: string })?.message ?? String(err);
  console.warn("Fel från bildlagringen:", message);
  if (/bucket not found/i.test(message)) {
    return new StorageError(
      "Bildlagringen är felkonfigurerad (bucketen finns inte).",
      500,
    );
  }
  return new StorageError(
    "Bildlagringen svarar inte just nu. Produkten behåller sin nuvarande bild, försök igen om en stund.",
    503,
  );
}

export async function uploadProductImage(
  productId: string | number,
  file: Buffer,
): Promise<{ path: string; url: string }> {
  if (file.length === 0) {
    throw new StorageError("Filen är tom.", 400);
  }
  if (file.length > MAX_IMAGE_BYTES) {
    throw new StorageError(
      `Bilden är för stor. Största tillåtna storlek är ${MAX_IMAGE_BYTES / 1024 / 1024} MB.`,
      400,
    );
  }
  const type = detectImageType(file);
  if (!type) {
    throw new StorageError("Bara JPEG- och PNG-bilder är tillåtna.", 400);
  }

  const path = `products/${productId}/${randomUUID()}.${type.ext}`;

  try {
    const store = bucket();
    const { data, error } = await store.upload(path, file, {
      contentType: type.contentType,
      upsert: false,
      cacheControl: "31536000",
    });
    if (error) throw error;
    const saved = UploadResult.parse(data);

    const { publicUrl } = PublicUrl.parse(store.getPublicUrl(saved.path).data);
    return { path: saved.path, url: publicUrl };
  } catch (err) {
    throw toStorageError(err);
  }
}

export async function deleteStoredImage(path: string): Promise<boolean> {
  try {
    const { error } = await bucket().remove([path]);
    if (error) throw error;
    return true;
  } catch (err) {
    console.warn(`Kunde inte ta bort ${path}:`, (err as Error).message);
    return false;
  }
}
