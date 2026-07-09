import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'

export function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-16 h-16 bg-gray-200 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <MessageSquare className="w-8 h-8 text-gray-400" />
      </div>
      <h1 className="text-4xl font-bold text-gray-300 mb-2">404</h1>
      <p className="text-gray-500 mb-4">This page doesn't exist</p>
      <Button onClick={() => navigate('/')}>Go Home</Button>
    </div>
  )
}

export default NotFoundPage
