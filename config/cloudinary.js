// config/cloudinary.js
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import dotenv from 'dotenv';
dotenv.config();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Returns a CloudinaryStorage instance scoped to a given folder.
 * @param {string} folder  e.g. 'movieverse/posters', 'movieverse/cast'
 */
export function makeStorage(folder = 'movieverse/uploads') {
  return new CloudinaryStorage({
    cloudinary,
    params: async (_req, file) => {
      const ext = file.originalname.split('.').pop().toLowerCase();
      const isVideo = ['mp4', 'mov', 'avi', 'mkv', 'webm'].includes(ext);
      return {
        folder,
        resource_type: isVideo ? 'video' : 'image',
        // Keep original quality for images; use auto format
        format: isVideo ? undefined : undefined, // let Cloudinary auto-detect
        transformation: isVideo ? [] : [{ quality: 'auto', fetch_format: 'auto' }],
        public_id: `${Date.now()}-${Math.round(Math.random() * 1e5)}`,
      };
    },
  });
}

/**
 * Extract a Cloudinary public_id from a secure_url for deletion.
 * e.g. "https://res.cloudinary.com/dzq7vqiie/image/upload/v.../movieverse/posters/abc.jpg"
 *   -> "movieverse/posters/abc"
 */
export function extractPublicId(url) {
  if (!url || typeof url !== 'string') return null;
  try {
    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;
    const afterUpload = url.slice(uploadIndex + '/upload/'.length);
    // Remove version segment (v1234567890/)
    const withoutVersion = afterUpload.replace(/^v\d+\//, '');
    // Remove file extension
    const dotIndex = withoutVersion.lastIndexOf('.');
    return dotIndex !== -1 ? withoutVersion.slice(0, dotIndex) : withoutVersion;
  } catch {
    return null;
  }
}

/**
 * Delete a Cloudinary resource by URL.
 */
export async function deleteFromCloudinary(url, resourceType = 'image') {
  const publicId = extractPublicId(url);
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });
  } catch (err) {
    console.warn('Cloudinary delete failed for', publicId, err?.message || err);
  }
}

export default cloudinary;
