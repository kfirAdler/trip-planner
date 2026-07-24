import { randomUUID } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";

export interface SavedImage {
  url: string;
}

// LOCAL DEV IMPLEMENTATION. When deploying to Vercel, replace this function's
// body with Vercel Blob's `put()` — the signature below is the only seam
// every call site depends on, so nothing else needs to change.
export async function saveImage(
  file: File,
  opts?: { prefix?: string }
): Promise<SavedImage> {
  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = path.extname(file.name) || ".jpg";
  const filename = `${opts?.prefix ?? "img"}-${randomUUID()}${ext}`;
  const dest = path.join(process.cwd(), "public", "uploads", filename);

  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, bytes);

  return { url: `/uploads/${filename}` };
}
