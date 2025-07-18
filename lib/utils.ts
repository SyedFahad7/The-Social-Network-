import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Utility to crop an image using canvas (for react-easy-crop)
export async function getCroppedImg(imageSrc: string, crop: any): Promise<Blob> {
  const image = new window.Image();
  image.src = imageSrc;
  await new Promise((resolve) => { image.onload = resolve; });
  const canvas = document.createElement('canvas');
  canvas.width = crop.width;
  canvas.height = crop.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No 2d context');
  ctx.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    crop.width,
    crop.height
  );
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
    }, 'image/jpeg');
  });
}
