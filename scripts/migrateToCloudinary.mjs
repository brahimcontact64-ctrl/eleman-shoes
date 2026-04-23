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

/** Upload with exponential-backoff retry. Returns the secure_url or throws. */
async function uploadWithRetry(url, productId) {
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
      const delay = RETRY_DELAY_MS * attempt;
      console.warn(
        `  ⚠️  Attempt ${attempt}/${MAX_RETRIES} failed for product ${productId}.` +
          ` Retrying in ${delay}ms… (${err?.message || err})`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw lastErr;
}

// ─── Migration ───────────────────────────────────────────────────────────────

async function migrate() {
  console.log("🚀 Starting Cloudinary migration…\n");

  const stats = {
    products: 0,
    imagesSkipped: 0,   // already on Cloudinary
    imagesUploaded: 0,
    imagesFailed: 0,
    failures: [],       // { productId, url, error }
  };

  try {
    const snap = await getDocs(collection(db, "products"));
    stats.products = snap.docs.length;
    console.log(`📦 Found ${stats.products} products\n`);

    for (const d of snap.docs) {
      const productId = d.id;
      const data = d.data();
      let productDirty = false;

      // ── 1. Migrate colors[].images[] ─────────────────────────────────────
      if (Array.isArray(data.colors)) {
        for (const color of data.colors) {
          if (!Array.isArray(color.images)) continue;

          for (const img of color.images) {
            if (!img?.url) continue;

            if (isCloudinary(img.url)) {
              console.log(`  ✅ Already Cloudinary — skip: ${img.url}`);
              stats.imagesSkipped++;
              continue;
            }

            if (!isFirebase(img.url)) {
              console.log(`  ℹ️  Unknown origin — skip: ${img.url}`);
              stats.imagesSkipped++;
              continue;
            }

            console.log(`  ⬆️  Uploading [${productId}] color "${color.name}": ${img.url}`);
            try {
              img.url = await uploadWithRetry(img.url, productId);
              console.log(`  🔗  → ${img.url}`);
              stats.imagesUploaded++;
              productDirty = true;
            } catch (err) {
              console.error(`  ❌ FAILED [${productId}]: ${img.url}`);
              console.error(`     Reason: ${err?.message || err}`);
              stats.imagesFailed++;
              stats.failures.push({ productId, url: img.url, error: err?.message || String(err) });
            }
          }
        }
      }

      // ── 2. Migrate top-level images[] (legacy field) ──────────────────────
      if (Array.isArray(data.images)) {
        for (let i = 0; i < data.images.length; i++) {
          const raw = data.images[i];
          const url = typeof raw === "string" ? raw : raw?.url;
          if (!url) continue;

          if (isCloudinary(url)) {
            console.log(`  ✅ Already Cloudinary — skip: ${url}`);
            stats.imagesSkipped++;
            continue;
          }

          if (!isFirebase(url)) {
            console.log(`  ℹ️  Unknown origin — skip: ${url}`);
            stats.imagesSkipped++;
            continue;
          }

          console.log(`  ⬆️  Uploading [${productId}] top-level image[${i}]: ${url}`);
          try {
            const newUrl = await uploadWithRetry(url, productId);
            console.log(`  🔗  → ${newUrl}`);
            if (typeof raw === "string") {
              data.images[i] = newUrl;
            } else {
              data.images[i].url = newUrl;
            }
            stats.imagesUploaded++;
            productDirty = true;
          } catch (err) {
            console.error(`  ❌ FAILED [${productId}] image[${i}]: ${url}`);
            console.error(`     Reason: ${err?.message || err}`);
            stats.imagesFailed++;
            stats.failures.push({ productId, url, error: err?.message || String(err) });
          }
        }
      }

      // ── 3. Write back only changed docs ──────────────────────────────────
      if (productDirty) {
        const update = {};
        if (Array.isArray(data.colors)) update.colors = data.colors;
        if (Array.isArray(data.images)) update.images = data.images;

        await updateDoc(doc(db, "products", productId), update);
        console.log(`  📝 Saved product ${productId}\n`);
      } else {
        console.log(`  ⏭️  No Firebase images to migrate for product ${productId}\n`);
      }
    }
  } catch (err) {
    console.error("\n🔥 Fatal error:", err?.message || err);
    console.error(err);
    process.exit(1);
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log("\n══════════════════════════════════════════");
  console.log("           MIGRATION SUMMARY");
  console.log("══════════════════════════════════════════");
  console.log(`  Products scanned : ${stats.products}`);
  console.log(`  Images skipped   : ${stats.imagesSkipped}  (already Cloudinary / unknown)`);
  console.log(`  Images uploaded  : ${stats.imagesUploaded}`);
  console.log(`  Images FAILED    : ${stats.imagesFailed}`);

  if (stats.failures.length > 0) {
    console.log("\n  Failed images (copy below to fix manually):");
    for (const f of stats.failures) {
      console.log(`    • [${f.productId}] ${f.url}`);
      console.log(`      ${f.error}`);
    }
    console.log("\n⚠️  Some images were not migrated. Re-run the script to retry.");
  } else {
    console.log("\n🎉 All images migrated successfully!");
  }
  console.log("══════════════════════════════════════════\n");
}

migrate();