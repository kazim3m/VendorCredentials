import { Readable } from "stream";
import { del, get, put } from "@vercel/blob";

import { env } from "@/lib/env";

export async function uploadBufferToBlob(params: {
  pathname: string;
  contentType: string;
  body: Buffer;
}) {
  return put(params.pathname, params.body, {
    access: "private",
    contentType: params.contentType,
    token: env.BLOB_READ_WRITE_TOKEN,
    addRandomSuffix: false,
    allowOverwrite: true
  });
}

export async function fetchBlobBuffer(urlOrPathname: string) {
  const result = await get(urlOrPathname, { access: "private", token: env.BLOB_READ_WRITE_TOKEN });
  if (!result || result.statusCode !== 200 || !result.stream || !result.blob) {
    throw new Error(`Blob not found: ${urlOrPathname}`);
  }

  const response = new Response(result.stream);
  const arr = await response.arrayBuffer();
  return {
    contentType: result.blob.contentType || "application/octet-stream",
    buffer: Buffer.from(arr)
  };
}

export async function getPrivateBlobReadable(urlOrPathname: string) {
  const result = await get(urlOrPathname, { access: "private", token: env.BLOB_READ_WRITE_TOKEN });
  if (!result || result.statusCode !== 200 || !result.stream || !result.blob) {
    return null;
  }
  return result;
}

export async function getPrivateBlob(urlOrPathname: string) {
  return getPrivateBlobReadable(urlOrPathname);
}

export async function getPrivateBlobStream(urlOrPathname: string): Promise<NodeJS.ReadableStream> {
  const blob = await getPrivateBlobReadable(urlOrPathname);
  if (!blob) {
    throw new Error(`Blob not found: ${urlOrPathname}`);
  }
  return Readable.fromWeb(blob.stream as any);
}

export async function deleteBlobByUrl(urlOrPathname: string | null | undefined) {
  if (!urlOrPathname) return;
  try {
    await del(urlOrPathname, { token: env.BLOB_READ_WRITE_TOKEN });
  } catch {
    // Ignore deletion errors so API flows are resilient.
  }
}
