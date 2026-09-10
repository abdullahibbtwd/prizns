export const CMS_IMAGE_MAX_BYTES = 10 * 1024 * 1024
export const CMS_VIDEO_MAX_BYTES = 200 * 1024 * 1024
export const CMS_AUDIO_MAX_BYTES = 50 * 1024 * 1024

export function cmsMaxBytesForFile(file: Pick<File, 'type'>) {
  const type = file.type.toLowerCase()
  if (type.startsWith('video/')) return CMS_VIDEO_MAX_BYTES
  if (type.startsWith('audio/')) return CMS_AUDIO_MAX_BYTES
  return CMS_IMAGE_MAX_BYTES
}

export function cmsMaxMbForFile(file: Pick<File, 'type'>) {
  return Math.round(cmsMaxBytesForFile(file) / (1024 * 1024))
}

export function assertCmsFileSize(file: Pick<File, 'type' | 'size'>) {
  const max = cmsMaxBytesForFile(file)
  if (file.size > max) {
    throw new Error(`File is too large (max ${Math.round(max / (1024 * 1024))} MB)`)
  }
}
