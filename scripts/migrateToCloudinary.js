import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  updateDoc,
  doc
} from "firebase/firestore";

import cloudinary from "cloudinary";

/* 🔥 CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyAletL_apzT8lkG5i-gsaWu8v1_dqzCdpY",
  authDomain: "smail-shoes.firebaseapp.com",
  projectId: "smail-shoes",
  storageBucket: "smail-shoes.firebasestorage.app",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* 🔥 CLOUDINARY CONFIG */
cloudinary.v2.config({
  cloud_name: "devq3prkj",
  api_key: "946982172754357",
  api_secret: "Wt5oglhDekxISkRFw6ZOzk-YKUU",
});

async function migrate() {
  console.log("🚀 Start migration...");

  try {
    const snap = await getDocs(collection(db, "products"));
    console.log(`📦 Found ${snap.docs.length} products`);

    for (const d of snap.docs) {
      const data = d.data();
      let updated = false;

      if (data.colors && Array.isArray(data.colors)) {
        for (const color of data.colors) {
          if (!color.images || !Array.isArray(color.images)) continue;

          for (const img of color.images) {
            if (img?.url && img.url.includes("firebasestorage")) {
              try {
                console.log("⬆️ Uploading:", img.url);

                const res = await cloudinary.v2.uploader.upload(img.url, {
                  folder: "products",
                  resource_type: "image",
                  use_filename: true,
                  unique_filename: true,
                  overwrite: false,
                });

                img.url = res.secure_url;
                updated = true;

                console.log("✅ Uploaded:", d.id);
                console.log("🔗 New URL:", res.secure_url);
              } catch (err) {
                console.log("❌ Error URL:", img.url);
                console.log("❌ Error message:", err?.message || err);
                console.log("❌ Full error object:", err);
              }
            }
          }
        }
      }

      if (updated) {
        await updateDoc(doc(db, "products", d.id), data);
        console.log("📝 Updated product:", d.id);
      } else {
        console.log("⏭️ No changes for product:", d.id);
      }
    }

    console.log("🎉 Migration done!");
  } catch (err) {
    console.log("🔥 Fatal migration error:", err?.message || err);
    console.log("🔥 Full fatal error:", err);
  }
}

migrate();