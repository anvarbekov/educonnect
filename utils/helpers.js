import { format, formatDistanceToNow } from 'date-fns';
import { uz } from 'date-fns/locale';

export const formatTime = (timestamp) => {
  if (!timestamp?.toDate) return '';
  return format(timestamp.toDate(), 'HH:mm');
};

export const formatDate = (timestamp) => {
  if (!timestamp?.toDate) return '';
  return format(timestamp.toDate(), 'dd MMMM yyyy', { locale: uz });
};

export const formatRelative = (timestamp) => {
  if (!timestamp?.toDate) return '';
  return formatDistanceToNow(timestamp.toDate(), { addSuffix: true, locale: uz });
};

export const formatFileSize = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const getFileIcon = (name) => {
  if (!name) return '📎';
  const ext = name.split('.').pop()?.toLowerCase();
  const icons = { pdf: '📕', doc: '📘', docx: '📘', xls: '📗', xlsx: '📗', txt: '📄', zip: '🗜️', rar: '🗜️', png: '🖼️', jpg: '🖼️', jpeg: '🖼️', gif: '🖼️' };
  return icons[ext] || '📎';
};

export const isImageFile = (type) => type?.startsWith('image/');

export const generateId = () => Math.random().toString(36).substring(2, 9);

export const truncate = (str, len = 60) => {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '...' : str;
};

export const highlightText = (text, query) => {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'gi');
  return text.replace(regex, '<mark>$1</mark>');
};

export const calculateSUSScore = (answers, questions) => {
  let total = 0;
  questions.forEach((q) => {
    const val = answers[q.id];
    if (val === undefined) return;
    if (q.positive) {
      total += val - 1;
    } else {
      total += 5 - val;
    }
  });
  return total * 2.5;
};

export const getSUSRating = (score) => {
  if (score >= 85) return { label: 'A\'lo', grade: 'A', color: 'success' };
  if (score >= 72) return { label: 'Yaxshi', grade: 'B', color: 'info' };
  if (score >= 52) return { label: 'O\'rta', grade: 'C', color: 'warning' };
  if (score >= 38) return { label: 'Qoniqarli', grade: 'D', color: 'warning' };
  return { label: 'Yomon', grade: 'F', color: 'error' };
};

export const debounce = (fn, ms = 300) => {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
};
