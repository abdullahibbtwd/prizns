export type DroppedFileSource = {
  files?: FileList | File[] | null
  items?: DataTransferItemList | Array<{
    kind: string
    type: string
    getAsFile: () => File | null
  }> | null
  types?: readonly string[] | null
}

export function dropHasFiles(data: DroppedFileSource | null | undefined) {
  if (!data) return false
  if (data.types && Array.from(data.types).includes('Files')) return true
  return Boolean(data.files && data.files.length > 0)
}

function filesFromItems(data: DroppedFileSource) {
  if (!data.items) return []
  const files: File[] = []
  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue
    const file = item.getAsFile()
    if (file) files.push(file)
  }
  return files
}

export function imageFilesFromDrop(data: DroppedFileSource | null | undefined) {
  if (!data) return []
  const fromList = data.files ? Array.from(data.files) : []
  const files = fromList.length > 0 ? fromList : filesFromItems(data)
  return files.filter((file) => file.type.startsWith('image/'))
}
