import axios from "axios";
import Constants from "expo-constants";

const expoExtra = (Constants.expoConfig && Constants.expoConfig.extra) ||
  (Constants.manifest && Constants.manifest.extra) || {};

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

  const formData = new FormData();
  formData.append("file", file as any);
  formData.append("upload_preset", UPLOAD_PRESET as string);

  // choose endpoint based on file type (support video uploads)
  const isVideo = typeof file.type === 'string' && file.type.startsWith('video');
  const endpoint = isVideo ? `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/video/upload` : `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

  const res = await axios.post(endpoint, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });

  return res.data.secure_url; // URL final hospedada
}