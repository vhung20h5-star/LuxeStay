import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DESTINATIONS,
  PROMOTION_CAMPAIGNS,
  PROPERTIES,
  TRAVEL_ACTIVITIES,
} from "../packages/domain/dist/seed/index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const WEB_PUBLIC_DIR = path.join(REPO_ROOT, "apps", "web", "public");

const MIN_LOCAL_BYTES = 5 * 1024;
const MAX_LOCAL_BYTES = 350 * 1024;
const CONCURRENCY = 20;

function normalizeMediaKey(src) {
  const withoutQuery = src.split("?")[0] ?? src;
  const pexelsMatch = withoutQuery.match(/^https:\/\/images\.pexels\.com\/photos\/(\d+)\//);
  if (pexelsMatch) return `pexels:${pexelsMatch[1]}`;
  return withoutQuery;
}

const entries = [
  ...PROPERTIES.flatMap((p) =>
    p.images.map((src, idx) => ({
      owner: `${p.id}[${idx}]`,
      group: "property",
      src,
    }))
  ),
  ...DESTINATIONS.map((d) => ({
    owner: `destination:${d.id}`,
    group: "destination",
    src: d.image,
  })),
  ...PROMOTION_CAMPAIGNS.map((c) => ({
    owner: `campaign:${c.slug}`,
    group: "campaign",
    src: c.image,
  })),
  ...TRAVEL_ACTIVITIES.flatMap((a) =>
    a.images.map((src, idx) => ({
      owner: `activity:${a.id}[${idx}]`,
      group: "activity",
      src,
    }))
  ),
];

const seen = new Map();
const duplicates = [];
const localEntries = [];
const remoteEntries = [];

for (const entry of entries) {
  const key = normalizeMediaKey(entry.src);
  if (seen.has(key)) {
    duplicates.push({ key, first: seen.get(key), duplicate: entry.owner });
  } else {
    seen.set(key, entry.owner);
  }
  if (entry.src.startsWith("/images/")) {
    localEntries.push(entry);
  } else {
    remoteEntries.push(entry);
  }
}

const failures = [];

for (const entry of localEntries) {
  const diskPath = path.join(WEB_PUBLIC_DIR, entry.src.replace(/^\//, ""));
  if (!fs.existsSync(diskPath)) {
    failures.push(`${entry.owner}: missing local file ${diskPath}`);
    continue;
  }
  const size = fs.statSync(diskPath).size;
  if (size < MIN_LOCAL_BYTES || size > MAX_LOCAL_BYTES) {
    failures.push(
      `${entry.owner}: local file size ${(size / 1024).toFixed(1)} KB outside allowed 5–350 KB (${entry.src})`
    );
  }
}

for (let i = 0; i < remoteEntries.length; i += CONCURRENCY) {
  const batch = remoteEntries.slice(i, i + CONCURRENCY);
  const results = await Promise.all(
    batch.map(async (entry) => {
      try {
        const res = await fetch(entry.src, {
          method: "HEAD",
          signal: AbortSignal.timeout(15000),
        });
        const contentType = res.headers.get("content-type") ?? "";
        if (!res.ok || !contentType.startsWith("image/")) {
          return `${entry.owner}: HTTP ${res.status} (${contentType || "no content-type"}) -> ${entry.src}`;
        }
        return null;
      } catch (err) {
        return `${entry.owner}: network error (${err instanceof Error ? err.message : String(err)}) -> ${entry.src}`;
      }
    })
  );
  for (const err of results) {
    if (err) failures.push(err);
  }
}

console.log(
  JSON.stringify(
    {
      totalSlots: entries.length,
      uniqueImages: seen.size,
      duplicateCount: duplicates.length,
      remoteRealPhotos: remoteEntries.length,
      localAiAssets: localEntries.length,
      failureCount: failures.length,
    },
    null,
    2
  )
);

if (duplicates.length > 0) {
  console.error("DUPLICATE IMAGES:", duplicates);
}
if (failures.length > 0) {
  console.error("BROKEN OR INVALID IMAGES:\n" + failures.join("\n"));
}
if (duplicates.length > 0 || failures.length > 0) {
  process.exit(1);
}
