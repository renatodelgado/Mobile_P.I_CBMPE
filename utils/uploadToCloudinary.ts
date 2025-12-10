import Constants from "expo-constants";

const expoExtra = (Constants.expoConfig && Constants.expoConfig.extra) ||
  (Constants.manifest && (Constants.manifest as any).extra) || {};

const CLOUD_NAME =
  expoExtra?.VITE_CLOUDINARY_CLOUD_NAME || process.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET =
  expoExtra?.VITE_CLOUDINARY_UPLOAD_PRESET || process.env.VITE_CLOUDINARY_UPLOAD_PRESET;

export async function uploadToCloudinary(file: any): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Cloudinary não configurado. Defina VITE_CLOUDINARY_CLOUD_NAME e VITE_CLOUDINARY_UPLOAD_PRESET no .env ou no app config (expo extra)."
    );
  }
  // Build FormData in a way compatible with React Native runtime.
  const isVideo = (file && typeof file.type === 'string' && file.type.startsWith('video'))
    || (file && typeof file.uri === 'string' && file.uri.toLowerCase().endsWith('.mp4'));
  const endpoint = isVideo
    ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload`
    : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const formData = new FormData();
  // three main shapes we may receive:
  // 1) React Native local file: { uri, name, type }
  // 2) converted blob: { _blob, name, type }
  // 3) data URL string (caller may pass the raw data URL)
  if (file && typeof file === 'string' && file.startsWith('data:')) {
    // Cloudinary accepts data URLs directly in the `file` field.
    // Appending the data URL string avoids unreliable fetch() behavior on React Native.
    formData.append('file', file);
  } else if (file && file._blob) {
    formData.append('file', file._blob as any, file.name || `file_${Date.now()}`);
  } else if (file && file.uri) {
    // If uri is a data URL (e.g., signature from SignaturePad), fetch and convert to blob
    if (typeof file.uri === 'string' && file.uri.startsWith('data:')) {
      // append the data URL string directly
      formData.append('file', file.uri);
    } else {
      formData.append('file', {
        uri: file.uri,
        name: file.name || `file_${Date.now()}`,
        type: file.type || (isVideo ? 'video/mp4' : 'image/jpeg'),
      } as any);
    }
  } else {
    // fallback: append what we received
    formData.append('file', file as any);
  }

  formData.append('upload_preset', UPLOAD_PRESET as string);

  // Use fetch() which is more predictable on RN for multipart uploads
  const res = await fetch(endpoint, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => 'no body');
    throw new Error(`Cloudinary upload failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  return data.secure_url || data.url || data.public_id || '';
}