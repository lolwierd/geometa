import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

// Use Node runtime so we can access the filesystem
export const runtime = "nodejs";

// Folder to store cached images on the server
const CACHE_DIR = path.resolve(process.cwd(), ".cache", "images");

async function ensureDir(dir: string) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    /* directory already exists */
  }
}

function hash(input: string): string {
  return crypto.createHash("sha1").update(input).digest("hex");
}

function extFromUrl(urlStr: string): string {
  try {
    const pathname = new URL(urlStr).pathname;
    const ext = path.extname(pathname);
    return ext || ".img";
  } catch {
    return ".img";
  }
}

function mimeFromExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".webp":
      return "image/webp";
    case ".gif":
      return "image/gif";
    default:
      return "application/octet-stream";
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const remote = searchParams.get("u");

  if (!remote) {
    return new NextResponse("Missing 'u' query parameter", { status: 400 });
  }

  // Validate URL and protocol
  let remoteURL: URL;
  try {
    remoteURL = new URL(remote);
    if (!/^https?:$/.test(remoteURL.protocol)) {
      throw new Error("Unsupported protocol");
    }
    // Allow only learnablemeta.com (and subdomains) to be proxied
    const allowedBases = ["learnablemeta.com", "flagcdn.com"];
    const host = remoteURL.hostname.toLowerCase();
    const allowed = allowedBases.some((base) => host === base || host.endsWith(`.${base}`));
    if (!allowed) {
      throw new Error("Host not allowed");
    }
  } catch {
    return new NextResponse("Invalid or disallowed URL", { status: 400 });
  }

  await ensureDir(CACHE_DIR);

  const ext = extFromUrl(remote);
  const filename = `${hash(remote)}${ext}`;
  const cachePath = path.join(CACHE_DIR, filename);

  try {
    const data = await fs.readFile(cachePath);
    return new NextResponse(data, {
      headers: {
        "Content-Type": mimeFromExt(ext),
        "Cache-Control": "public, max-age=31536000, immutable",
        "x-proxy-cache": "hit",
      },
    });
  } catch {
    // cache miss, continue
  }

  // Fetch from remote source
  const upstream = await fetch(remoteURL.href);
  if (!upstream.ok) {
    return new NextResponse("Upstream fetch failed", { status: upstream.status });
  }

  const arrayBuffer = await upstream.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Save to cache (ignore errors)
  fs.writeFile(cachePath, buffer).catch(() => {});

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") || mimeFromExt(ext),
      "Cache-Control": "public, max-age=31536000, immutable",
      "x-proxy-cache": "miss",
    },
  });
}
