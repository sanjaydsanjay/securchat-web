import { Button } from '@/components/ui/button'
import { MapPin } from 'lucide-react'

interface LocationShareProps {
  onShare: (lat: number, lng: number) => void
}

export function LocationShare({ onShare }: LocationShareProps) {
  const handleShare = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => onShare(pos.coords.latitude, pos.coords.longitude),
        (err) => console.error('Geolocation error:', err)
      )
    }
  }

  return (
    <Button variant="ghost" size="icon" onClick={handleShare}>
      <MapPin className="w-5 h-5" />
    </Button>
  )
}
