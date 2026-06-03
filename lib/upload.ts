export function uploadToS3(
  url: string,
  file: File,
  contentType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', contentType)
    xhr.upload.onprogress = e => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => xhr.status < 300 ? resolve() : reject(new Error(`S3 error ${xhr.status}`))
    xhr.onerror = () => reject(new Error('Network error during upload'))
    xhr.send(file)
  })
}
