// lib/cloudinaryUpload.js
// Firebase Storage o'rniga Cloudinary bepul xizmat

const CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

const ALLOWED_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'audio/webm', 'audio/ogg', 'audio/mp4', 'audio/mpeg',
];

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export async function uploadToCloudinary(file, folder = 'educonnect') {
  // Tekshirish
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Fayl turi qo\'llab-quvvatlanmaydi');
  }
  if (file.size > MAX_SIZE) {
    throw new Error('Fayl hajmi 10MB dan oshmasligi kerak');
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', UPLOAD_PRESET);
  formData.append('folder', folder);

  // Resource type aniqlash
  let resourceType = 'auto';
  if (file.type.startsWith('audio/')) {
    resourceType = 'video'; // Cloudinary audio ni video deb hisoblaydi
  }

  const url = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/${resourceType}/upload`;

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Yuklash xato');
  }

  const data = await response.json();

  return {
    url: data.secure_url,
    publicId: data.public_id,
    format: data.format,
    size: data.bytes,
    resourceType: data.resource_type,
  };
}

// Fayl ikonkasi
export function getFileIcon(name) {
  if (!name) return '📎';
  const ext = name.split('.').pop()?.toLowerCase();
  const icons = {
    pdf: '📕', doc: '📘', docx: '📘',
    xls: '📗', xlsx: '📗', txt: '📄',
    zip: '🗜️', rar: '🗜️',
    png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️', webp: '🖼️',
  };
  return icons[ext] || '📎';
}

// Hajm formatlash
export function formatFileSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}