import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/hooks/useAuth'
import { emailSchema } from '@/utils/validators'
import { MessageSquare, Mail, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'

export function LoginPage() {
  const navigate = useNavigate()
  const { signUp, signIn } = useAuth()

  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [verificationSent, setVerificationSent] = useState(false)

  const validate = (): boolean => {
    if (isSignUp && !displayName.trim()) {
      setError('Display name is required')
      return false
    }
    const emailResult = emailSchema.safeParse(email)
    if (!emailResult.success) {
      setError('Please enter a valid email address')
      return false
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setVerificationSent(false)

    if (!validate()) return

    setLoading(true)

    if (isSignUp) {
      const { data: signUpData, error: signUpError } = await signUp(email, password, displayName)
      setLoading(false)

      if (signUpError) {
        setError(typeof signUpError === 'string' ? signUpError : signUpError.message)
      } else if (signUpData?.session) {
        // Email confirmation is disabled: the user is signed in immediately.
        // The auth state (ProtectedRoute) will redirect to the chat automatically.
      } else {
        setVerificationSent(true)
      }
    } else {
      const { error: signInError } = await signIn(email, password)
      setLoading(false)

      if (signInError) {
        const errMsg = typeof signInError === 'string' ? signInError : signInError.message
        if (errMsg?.toLowerCase().includes('email not confirmed')) {
          setError('Please verify your email first. Check your inbox.')
        } else {
          setError(errMsg || 'An error occurred')
        }
      }
    }
  }

  const switchMode = () => {
    setIsSignUp(!isSignUp)
    setError(null)
    setVerificationSent(false)
  }

  if (verificationSent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
        <div className="w-full max-w-sm text-center space-y-4">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto">
            <Mail className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-xl font-bold">Verify your email</h1>
          <p className="text-sm text-gray-500">
            We sent a verification link to <strong>{email}</strong>
          </p>
          <p className="text-xs text-gray-400">
            Click the link in the email to activate your account, then sign in.
          </p>
          <div className="flex flex-col gap-2 pt-2">
            <Button variant="outline" onClick={() => navigate('/login')}>
              Go to Sign In
            </Button>
            <button
              onClick={() => setVerificationSent(false)}
              className="text-xs text-[#128C7E] hover:underline"
            >
              Use a different email
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-[#128C7E] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <MessageSquare className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold">SecureChat AI</h1>
          <p className="text-sm text-gray-500 mt-1">
            {isSignUp ? 'Create your anonymous account' : 'Sign in to your account'}
          </p>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-800">
          <div className="flex gap-2 mb-4">
            <Button
              type="button"
              variant={!isSignUp ? 'default' : 'secondary'}
              onClick={() => { setIsSignUp(false); setError(null) }}
              className="flex-1"
            >
              Sign In
            </Button>
            <Button
              type="button"
              variant={isSignUp ? 'default' : 'secondary'}
              onClick={() => { setIsSignUp(true); setError(null) }}
              className="flex-1"
            >
              Sign Up
            </Button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">
                  Display Name
                </label>
                <Input
                  placeholder="How others will see you"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  maxLength={50}
                  required={isSignUp}
                />
              </div>
            )}

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="pl-10 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {!isSignUp && (
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs text-[#128C7E] hover:underline block ml-auto"
              >
              
              </button>
            )}

            {error && (
              <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 rounded-lg px-3 py-2">{error}</p>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> {isSignUp ? 'Creating Account...' : 'Signing In...'}</>
              ) : (
                isSignUp ? 'Create Account' : 'Sign In'
              )}
            </Button>
          </form>
        </div>

        <p className="text-xs text-center text-gray-400">
          {isSignUp
            ? 'By signing up, you agree to our Terms of Service and Privacy Policy'
            : 'Your unique 6-digit ID is your identity. Email is never shared.'}
        </p>
      </div>
    </div>
  )
}

export default LoginPage
