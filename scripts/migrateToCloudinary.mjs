import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc,
} from "firebase/firestore";
import { v2 as cloudinary } from "cloudinary";

// ─── Firebase config ────────────────────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyAletL_apzT8lkG5i-gsaWu8v1_dqzCdpY",
  authDomain: "smail-shoes.firebaseapp.com",
  projectId: "smail-shoes",
  storageBucket: "smail-shoes.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ─── Cloudinary config ───────────────────────────────────────────────────────
cloudinary.config({
  cloud_name: "devq3prkj",
  api_key: "946982172754357",
  api_secret: "Wt5oglhDekxISkRFw6ZOzk-YKUU",
});

// ─── Constants ───────────────────────────────────────────────────────────────
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1500;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns true when the URL already lives on Cloudinary. */
function isCloudinary(url) {
  return typeof url === "string" && url.includes("res.cloudinary.com");
}

/** Returns true when the URL is a Firebase Storage URL that needs migration. */
function isFirebase(url) {
  return (
    typeof url === "string" &&
    (url.includes("firebasestorage.googleapis.com") ||
      url.includes("firebasestorage.app"))
  );
}

/**
 * Sanitizes a URL so spaces and unsafe characters in the path are percent-encoded
 * while preserving already-encoded sequences and the query string intact.
 * Firebase Storage URLs often contain spaces or Unicode in the object path.
 */
function sanitizeUrl(raw) {
  try {
    // Parse first so we get a clean origin + pathname + search split
    const u = new URL(raw);
    // Re-encode only the pathname: decode fully first, then encode
    // This handles both already-encoded (%20) and literal spaces
    u.pathname = u.pathname
      .split("/")
      .map((segment) => encodeURIComponent(decodeURIComponent(segment)))
      .join("/");
    return u.toString();
  } catch {
    // Fallback: replace literal spaces only
    return raw.replace(/ /g, "%20");
  }
}

/**
 * Checks whether a Cloudinary URL actually resolves (HTTP 200).
 * Returns true = reachable, false = broken / missing.
 */
async function isReachable(url) {
  try {
    const res = await fetch(url, { method: "HEAD" });
    return res.ok; // 200-299
  } catch {
    return false;
  }
}

/**
 * Formats a Cloudinary API error with as much detail as possible.
 */
function formatCloudinaryError(err) {
  if (!err) return "Unknown error";
  const parts = [];
  if (err.message) parts.push(err.message);
  if (err.http_code) parts.push(`HTTP ${err.http_code}`);
  if (err.error?.message) parts.push(err.error.message);
  if (err.response?.error?.message) parts.push(err.response.error.message);
  return parts.length ? parts.join(" | ") : String(err);
}

/**
 * Uploads a URL to Cloudinary with sanitization and exponential-backoff retry.
 * Returns the secure_url or throws after MAX_RETRIES attempts.
 */
async function uploadWithRetry(rawUrl, productId) {
  const url = sanitizeUrl(rawUrl);
  if (url !== rawUrl) {
    console.log(`  🔧 Sanitized URL: ${rawUrl} → ${url}`);
  }

  let lastErr;
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await cloudinary.uploader.upload(url, {
        folder: "products",
        resource_type: "image",
        use_filename: true,
        unique_filename: true,
        overwrite: false,
      });
      return res.secure_url;
    } catch (err) {
      lastErr = err;
      const detail = formatCloudinaryError(err);
      const delay = RETRY_DELAY_MS * attempt;
      if (attempt < MAX_RETRIES) {
        console.warn(
          `  ⚠️  [${productId}] Attempt ${attempt}/${MAX_RETRIES} failed. Retrying in ${delay}ms…`
        );
        console.warn(`     Error: ${detail}`);
        await new Promise((r) => setTimeout(r, delay));
      } else {
        console.error(`  ❌ [${productId}] All ${MAX_RETRIES} attempts failed.`);
        console.error(`     Source URL  : ${rawUrl}`);
        console.error(`     Final error : ${detail}`);
        if (err.stack) console.error(`     Stack       : ${err.stack}`);
      }
    }
  }
  throw lastErr;
}

/**
 * Processes a single image URL. Returns the new Cloudinary URL, or the
 * original URL if it should be skipped, or null if it failed.
 * Handles both: Firebase→Cloudinary upload, and broken-Cloudinary re-upload.
 */
async function processUrl(url, productId, label, stats) {
  if (!url || typeof url !== "string") return url;

  // ── Case 1: already a Cloudinary URL ─────────────────────────────────────
  if (isCloudinary(url)) {
    const reachable = await isReachable(url);
    if (reachable) {
      console.log(`  ✅ Cloudinary OK — skip: ${url.slice(0, 80)}…`);
      stats.imagesSkipped++;
      return url; // keep as-is
    }
    // Cloudinary URL exists in DB but the asset is missing — re-upload is
    // impossible (we no longer have the original). Flag it.
    console.warn(`  ⚠️  Cloudinary URL is BROKEN (404) [${productId}] ${label}`);
    console.warn(`     URL: ${url}`);
    stats.imagesBroken++;
    stats.failures.push({
      productId,
      label,
      url,
      error: "Cloudinary asset returns 404 – original Firebase URL no longer available",
    });
    return url; // nothing we can do without the original
  }

  // ── Case 2: Firebase URL — needs upload ───────────────────────────────────
  if (isFirebase(url)) {
    console.log(`  ⬆️  Uploading [${productId}] ${label}: ${url.slice(0, 80)}…`);
    try {
      const newUrl = await uploadWithRetry(url, productId);
      console.log(`  🔗  → ${newUrl}`);
      stats.imagesUploaded++;
      return newUrl;
    } catch (err) {
      stats.imagesFailed++;
      stats.failures.push({
        productId,
        label,
        url,
        error: formatCloudinaryError(err),
      });
      return url; // keep original so we don't lose the reference
    }
  }

  // ── Case 3: unknown origin (local path, other CDN, etc.) ─────────────────
  console.log(`  ℹ️  Unknown origin — skip: ${url.slice(0, 80)}`);
  stats.imagesSkipped++;
  return url;
}

// ─── Main migration ──────────────────────────────────────────────────────────

async function migrate() {
  console.log("🚀 Starting Cloudinary migration…\n");

  const stats = {
    products: 0,
    imagesSkipped: 0,  // already OK on Cloudinary or unknown origin
    imagesUploaded: 0, // Firebase → Cloudinary success
    imagesFailed: 0,   // Firebase → Cloudinary hard failure
    imagesBroken: 0,   // already-Cloudinary but 404
    failures: [],      // { productId, label, url, error }
  };

  try {
    const snap = await getDocs(collection(db, "products"));
    stats.products = snap.docs.length;
    console.log(`📦 Found ${stats.products} products\n`);

    for (const d of snap.docs) {
      const productId = d.id;
      const data = d.data();
      let productDirty = false;

      console.log(`── Product ${productId} (${data.name || "unnamed"}) ──`);

      // ── 1. colors[].images[] ─────────────────────────────────────────────
      if (Array.isArray(data.colors)) {
        for (const color of data.colors) {
          if (!Array.isArray(color.images)) continue;
          for (const img of color.images) {
            if (!img?.url) continue;
            const original = img.url;
            img.url = await processUrl(img.url, productId, `color "${color.name}"`, stats);
            if (img.url !== original) productDirty = true;
          }
        }
      }

      // ── 2. top-level images[] (legacy field) ─────────────────────────────
      if (Array.isArray(data.images)) {
        for (let i = 0; i < data.images.length; i++) {
          const raw = data.images[i];
          const isStr = typeof raw === "string";
          const original = isStr ? raw : raw?.url;
          if (!original) continue;

          const newUrl = await processUrl(original, productId, `image[${i}]`, stats);
          if (newUrl !== original) {
            if (isStr) data.images[i] = newUrl;
            else data.images[i].url = newUrl;
            productDirty = true;
          }
        }
      }

      // ── 3. Write only changed documents ──────────────────────────────────
      if (productDirty) {
        const update = {};
        if (Array.isArray(data.colors)) update.colors = data.colors;
        if (Array.isArray(data.images)) update.images = data.images;
        await updateDoc(doc(db, "products", productId), update);
        console.log(`  📝 Saved changes for product ${productId}\n`);
      } else {
        console.log(`  ⏭️  Nothing to update for product ${productId}\n`);
      }
    }
  } catch (err) {
    console.error("\n🔥 Fatal error:", err?.message || err);
    if (err?.stack) console.error(err.stack);
    process.exit(1);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  const totalProblems = stats.imagesFailed + stats.imagesBroken;

  console.log("\n══════════════════════════════════════════");
  console.log("           MIGRATION SUMMARY");
  console.log("══════════════════════════════════════════");
  console.log(`  Products scanned        : ${stats.products}`);
  console.log(`  Images already OK       : ${stats.imagesSkipped}`);
  console.log(`  Images uploaded (new)   : ${stats.imagesUploaded}`);
  console.log(`  Images FAILED to upload : ${stats.imagesFailed}`);
  console.log(`  Images broken on CDN    : ${stats.imagesBroken}`);

  if (stats.failures.length > 0) {
    console.log("\n  ── Problem list ─────────────────────────────────");
    for (const f of stats.failures) {
      console.log(`  • [${f.productId}] ${f.label}`);
      console.log(`    URL   : ${f.url}`);
      console.log(`    Error : ${f.error}`);
    }
    console.log(
      `\n⚠️  ${totalProblems} image(s) need attention. ` +
        "Re-run the script to retry failed uploads."
    );
  } else {
    console.log("\n🎉 All images migrated and verified successfully!");
    console.log("   No Firebase URLs remain in the database.");
  }

  console.log("══════════════════════════════════════════\n");

  // Exit with non-zero if any hard failures so CI/CD can detect them
  if (stats.imagesFailed > 0) process.exit(1);
}

migrate();