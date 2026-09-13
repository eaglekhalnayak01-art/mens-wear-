/**
 * Upload helper shared by the product image manager and the settings logo picker.
 *
 * XMLHttpRequest on purpose: `fetch` still cannot report upload progress, and an
 * owner uploading phone photos deserves an honest percentage rather than a spinner
 * that could be waiting on anything.
 */
export type UploadedImage = { src: string; alt: string; bytes: number; width: number; height: number };

export type UploadResponse = { images: UploadedImage[]; failed: { name: string; reason: string }[] };

export function uploadImages(files: File[], onProgress?: (percent: number) => void, url = "/api/admin/images/upload"): Promise<UploadResponse> {
  const body = new FormData();
  files.forEach((file) => body.append("files", file));

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", url);
    xhr.upload.onprogress = (event) => {
      if (onProgress && event.lengthComputable) onProgress(Math.min(99, Math.round((event.loaded / event.total) * 100)));
    };
    xhr.onload = () => {
      let data: { images?: UploadedImage[]; failed?: UploadResponse["failed"]; error?: string } = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* an error page from a proxy — fall through to the message below */
      }
      if (xhr.status >= 200 && xhr.status < 300 && data.images) {
        onProgress?.(100);
        resolve({ images: data.images, failed: data.failed ?? [] });
      } else {
        reject(new Error(data.error ?? "We could not upload that photo."));
      }
    };
    xhr.onerror = () => reject(new Error("The upload was interrupted — check the connection and try again."));
    xhr.send(body);
  });
}
