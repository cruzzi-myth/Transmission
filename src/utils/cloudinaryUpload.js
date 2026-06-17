// Real video upload via Cloudinary's unsigned upload endpoint.
// Needs an unsigned upload preset configured in your Cloudinary dashboard
// (Settings > Upload > Upload presets > Add upload preset > Signing mode: Unsigned).
// Unsigned presets are the only safe way to upload directly from the browser -
// never put your Cloudinary API secret in frontend code.
//
// AUTOMATED CONTENT MODERATION SETUP (required for the auto-scan pipeline
// to actually run - this is dashboard configuration, not code, since
// unsigned uploads can't pass arbitrary moderation params from the browser):
//   1. Go to Settings > Upload > your upload preset > Add-ons section.
//   2. Enable a moderation add-on under "Moderation" - either:
//        - WebPurify Image/Video Moderation (flags explicit content), or
//        - Amazon Rekognition AI Moderation (broader category detection)
//      Both are usable on Cloudinary's free tier with limited monthly
//      scans; check current quotas in your dashboard before relying on
//      this at scale.
//   3. Go to Settings > Notifications > Webhook notification URL, and set
//      it to: https://your-server-domain.com/api/cloudinary/moderation-webhook
//      (server/moderationWebhook.js handles and verifies this).
//   4. Once both are set, every upload automatically gets scanned after
//      it finishes uploading, and the result lands on the upload's
//      Firestore doc via the webhook - no per-upload code change needed.
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

// Soft client-side cap so people get instant feedback instead of sitting
// through a slow upload that Cloudinary rejects anyway. This should be set
// to match (or sit just under) whatever max file size is configured on the
// upload preset itself in the Cloudinary dashboard - this constant doesn't
// enforce anything server-side, it's purely a faster failure path.
const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024; // 500MB

export async function uploadVideoToCloudinary(file, onProgress) {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary isn't configured - set VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in .env"
    );
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    const limitMb = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
    throw new Error(`This file is too large. Please keep uploads under ${limitMb}MB.`);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("resource_type", "video");

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        const data = JSON.parse(xhr.responseText);
        resolve({
          url: data.secure_url,
          publicId: data.public_id,
          durationSeconds: Math.round(data.duration || 0),
        });
      } else {
        reject(new Error(`Upload failed (${xhr.status}): ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during upload. Check your connection and try again."));
    xhr.ontimeout = () => reject(new Error("Upload timed out. Try a smaller file or a more stable connection."));
    xhr.timeout = 10 * 60 * 1000; // 10 minutes - generous for a slow connection with a large video
    xhr.send(formData);
  });
}
