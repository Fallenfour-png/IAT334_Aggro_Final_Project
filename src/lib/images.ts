const MB = 1024 * 1024;
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif'];

/** Reads an upload, checks Figma's rules (JPEG/PNG/GIF, size cap) and shrinks it so it fits in saved data. */
export function readImage(file: File, maxMb: number, w: number, h: number): Promise<string> {
  if (!IMAGE_TYPES.includes(file.type)) return Promise.reject(new Error('That file isn’t a JPEG, PNG, or GIF.'));
  if (file.size > maxMb * MB) return Promise.reject(new Error(`That file is larger than ${maxMb}MB.`));
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const scale = Math.max(w / img.width, h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      canvas.getContext('2d')!.drawImage(img, (w - dw) / 2, (h - dh) / 2, dw, dh);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.86));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('That image couldn’t be read.'));
    };
    img.src = url;
  });
}

