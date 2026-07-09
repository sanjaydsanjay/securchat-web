import { useState } from 'react'
import { FileText, Play, X } from 'lucide-react'

interface MediaPreviewProps {
  file: File
  onRemove: () => void
}

export function MediaPreview({ file, onRemove }: MediaPreviewProps) {
  const [preview, setPreview] = useState<string | null>(null)

  const isImage = file.type.startsWith('image/')
  const isVideo = file.type.startsWith('video/')

  if (isImage && !preview) {
    const reader = new FileReader()
    reader.onload = (e) => setPreview(e.target?.result as string)
    reader.readAsDataURL(file)
  }

  return (
    <div className="relative inline-block group">
      <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
        {preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : isVideo ? (
          <Play className="w-6 h-6 text-gray-400" />
        ) : (
          <FileText className="w-6 h-6 text-gray-400" />
        )}
      </div>
      <button
        onClick={onRemove}
        className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
      >
        <X className="w-3 h-3" />
      </button>
      <p className="text-[10px] text-gray-400 mt-1 truncate max-w-16">{file.name}</p>
    </div>
  )
}
