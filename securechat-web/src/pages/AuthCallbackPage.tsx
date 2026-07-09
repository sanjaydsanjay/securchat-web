import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabaseConfig'
import { Loader } from '@/components/shared/Loader'
import { CheckCircle, XCircle } from 'lucide-react'

export function AuthCallbackPage() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('Verifying your email...')

  useEffect(() => {
    const handleAuthCallback = async () => {
      const { searchParams, hash } = new URL(window.location.href)

      // Supabase sends tokens in URL hash for PKCE flow
      if (hash && hash.includes('access_token')) {
        const { error } = await supabase.auth.setSession({
          access_token: new URLSearchParams(hash.slice(1)).get('access_token') || '',
          refresh_token: new URLSearchParams(hash.slice(1)).get('refresh_token') || '',
        })
        if (error) {
          setStatus('error')
          setMessage(error.message)
          return
        }
        setStatus('success')
        setMessage('Email verified successfully! Redirecting...')
        setTimeout(() => navigate('/', { replace: true }), 1500)
        return
      }

      // Handle type=invite or type=signup from email link
      const type = searchParams.get('type')
      const code = searchParams.get('code')
      if ((type === 'signup' || type === 'invite' || type === 'recovery') && code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('error')
          setMessage(error.message)
          return
        }
        setStatus('success')

        if (type === 'recovery') {
          setMessage('Password reset verified! Redirecting...')
          setTimeout(() => navigate('/reset-password', { replace: true }), 1500)
        } else {
          setMessage('Email verified! Redirecting...')
          setTimeout(() => navigate('/', { replace: true }), 1500)
        }
        return
      }

      // Handle code param without type (older/flat email templates)
      if (code && !type) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          setStatus('error')
          setMessage(error.message)
          return
        }
        setStatus('success')
        setMessage('Password reset verified! Redirecting...')
        setTimeout(() => navigate('/reset-password', { replace: true }), 1500)
        return
      }

      // Fallback: check for existing session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setStatus('success')
        setMessage('Already authenticated. Redirecting...')
        setTimeout(() => navigate('/', { replace: true }), 1000)
      } else {
        setStatus('error')
        setMessage('No authentication data found. Please try signing in.')
        setTimeout(() => navigate('/login', { replace: true }), 3000)
      }
    }

    handleAuthCallback()
  }, [navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="text-center space-y-4">
        {status === 'loading' && (
          <>
            <Loader size="lg" />
            <p className="text-sm text-gray-500">{message}</p>
          </>
        )}
        {status === 'success' && (
          <>
            <CheckCircle className="w-12 h-12 text-green-500 mx-auto" />
            <p className="text-sm text-green-600 font-medium">{message}</p>
          </>
        )}
        {status === 'error' && (
          <>
            <XCircle className="w-12 h-12 text-red-500 mx-auto" />
            <p className="text-sm text-red-600 font-medium">{message}</p>
            <p className="text-xs text-gray-400">Redirecting to login...</p>
          </>
        )}
      </div>
    </div>
  )
}

export default AuthCallbackPage
