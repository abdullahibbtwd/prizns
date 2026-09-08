import { useRef, useState, type DragEvent } from 'react'
import {
  dropHasFiles,
  imageFilesFromDrop,
} from '@/cms/lib/dropped-images'

export function useImageFileDrop({
  disabled,
  onImages,
}: {
  disabled?: boolean
  onImages: (files: File[]) => void | Promise<void>
}) {
  const [active, setActive] = useState(false)
  const depthRef = useRef(0)

  const reset = () => {
    depthRef.current = 0
    setActive(false)
  }

  const onDragEnterCapture = (event: DragEvent) => {
    if (disabled || !dropHasFiles(event.dataTransfer)) return
    event.preventDefault()
    depthRef.current += 1
    setActive(true)
  }

  const onDragOverCapture = (event: DragEvent) => {
    if (disabled || !dropHasFiles(event.dataTransfer)) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'copy'
  }

  const onDragLeaveCapture = () => {
    depthRef.current = Math.max(0, depthRef.current - 1)
    if (depthRef.current === 0) setActive(false)
  }

  const onDropCapture = (event: DragEvent) => {
    if (disabled || !dropHasFiles(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    const images = imageFilesFromDrop(event.dataTransfer)
    reset()
    if (images.length === 0) return
    void onImages(images)
  }

  return {
    active,
    props: {
      onDragEnterCapture,
      onDragOverCapture,
      onDragLeaveCapture,
      onDropCapture,
    },
  }
}
