const crypto = require('crypto');

const isCloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME?.trim()
  && process.env.CLOUDINARY_API_KEY?.trim()
  && process.env.CLOUDINARY_API_SECRET?.trim()
);

/** Uploads an in-memory image buffer to Cloudinary using a signed REST upload. */
async function uploadBufferToCloudinary({ buffer, mimetype, originalname, folder = 'nivestry' }) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();

  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error('Cloudinary credentials are incomplete.');
  }

  const timestamp = Math.floor(Date.now() / 1000);
  const signaturePayload = `folder=${folder}&timestamp=${timestamp}${apiSecret}`;
  const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');

  const form = new FormData();
  const blob = new Blob([buffer], { type: mimetype || 'image/jpeg' });
  form.append('file', blob, originalname || `upload-${timestamp}.jpg`);
  form.append('api_key', apiKey);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName)}/image/upload`, {
    method: 'POST',
    body: form,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || !data.secure_url) {
    throw new Error(data?.error?.message || `Cloudinary upload failed (${response.status}).`);
  }

  return {
    secureUrl: data.secure_url,
    publicId: data.public_id,
  };
}

module.exports = {
  isCloudinaryConfigured,
  uploadBufferToCloudinary,
};
