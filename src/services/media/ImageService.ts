/**
 * ImageService.ts
 * Client-side high performance image compression and optimization.
 * Resizes images to max 1280px maintaining aspect ratio and compresses to WebP/JPEG
 * ensuring zero bandwidth overload, instant transmission, and zero server storage cost.
 */

export interface ProcessedImage {
  dataUrl: string;
  width: number;
  height: number;
  sizeBytes: number;
  mimeType: string;
}

export class ImageService {
  /**
   * Compresses a File into a lightweight Data URL
   */
  static async processImageFile(file: File, maxDimension = 1280, quality = 0.78): Promise<ProcessedImage> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          let { width, height } = img;

          // Scale down if exceeding maxDimension
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Failed to get canvas 2d context'));
            return;
          }

          // Smooth resampling
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(img, 0, 0, width, height);

          // Attempt WebP, fallback to JPEG
          let mimeType = 'image/webp';
          let dataUrl = canvas.toDataURL(mimeType, quality);

          // If browser doesn't support WebP export properly, fallback to jpeg
          if (!dataUrl.startsWith('data:image/webp')) {
            mimeType = 'image/jpeg';
            dataUrl = canvas.toDataURL(mimeType, quality);
          }

          // Calculate approximate byte size
          const head = dataUrl.indexOf(',') + 1;
          const sizeBytes = Math.round((dataUrl.length - head) * 0.75);

          resolve({
            dataUrl,
            width,
            height,
            sizeBytes,
            mimeType
          });
        };

        img.onerror = () => reject(new Error('Failed to decode image file'));
        img.src = e.target?.result as string;
      };

      reader.onerror = () => reject(new Error('Failed to read image file'));
      reader.readAsDataURL(file);
    });
  }
}
