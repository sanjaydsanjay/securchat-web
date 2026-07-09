import { X, Download, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MediaViewerProps {
  url: string
  type: 'image' | 'video'
  onClose: () => void
}

export function MediaViewer({ url, type, onClose }: MediaViewerProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center" onClick={onClose}>
      <button onClick={onClose} className="absolute top-4 right-4 p-2 text-white hover:bg-white/10 rounded-full">
        <X className="w-6 h-6" />
      </button>
      <div className="absolute top-4 left-4 flex gap-2">
        <Button variant="ghost" size="icon" className="text-white">
          <Download className="w-5 h-5" />
        </Button>
        <Button variant="ghost" size="icon" className="text-white">
          <Trash2 className="w-5 h-5" />
        </Button>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh]">
        {type === 'image' ? (
          <img src={url} alt="Media" className="max-w-full max-h-[90vh] object-contain" />
        ) : (
          <video src={url} controls className="max-w-full max-h-[90vh]" />
        )}
      </div>
    </div>
  )
}
