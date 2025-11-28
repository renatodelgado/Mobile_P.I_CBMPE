const dotenv = require('dotenv');

// Load .env into process.env when running expo CLI / node
dotenv.config();

module.exports = ({ config }) => ({
  ...config,
  extra: {
    VITE_CLOUDINARY_CLOUD_NAME: process.env.VITE_CLOUDINARY_CLOUD_NAME,
    VITE_CLOUDINARY_UPLOAD_PRESET: process.env.VITE_CLOUDINARY_UPLOAD_PRESET,
    VITE_CLOUDINARY_API_KEY: process.env.VITE_CLOUDINARY_API_KEY,
  },
});
