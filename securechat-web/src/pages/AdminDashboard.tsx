import { Tabs } from '@/components/ui/tabs'
import { useState, useEffect } from 'react'
import { Users, Flag, CreditCard, BarChart3, Shield, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { paymentService } from '@/services/paymentService'
import { useAuthStore } from '@/stores/authStore'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

export function AdminDashboard() {
  const [tab, setTab] = useState('payments')
  const user = useAuthStore((s) => s.user)

  if (!user?.is_admin) {
    return (
      <div className="max-w-6xl mx-auto p-6 text-center py-12">
        <Shield className="w-12 h-12 text-gray-300 mx-auto mb-4" />
        <h1 className="text-xl font-bold">Access Denied</h1>
        <p className="text-sm text-gray-500">You do not have admin privileges.</p>
      </div>
    )
  }

  const tabs = [
    { value: 'analytics', label: 'Analytics', content: <AdminAnalytics /> },
    { value: 'users', label: 'Users', content: <AdminUsers /> },
    { value: 'reports', label: 'Reports', content: <AdminReports /> },
    { value: 'payments', label: 'Payments', content: <AdminPayments /> },
  ]

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Shield className="w-6 h-6 text-[#128C7E]" />
        <h1 className="text-xl font-bold">Admin Dashboard</h1>
      </div>
      <Tabs value={tab} onValueChange={setTab} tabs={tabs} />
    </div>
  )
}

function AdminAnalytics() {
  const metrics = [
    { label: 'DAU', value: '0', icon: Users },
    { label: 'MAU', value: '0', icon: Users },
    { label: 'Messages Today', value: '0', icon: BarChart3 },
    { label: 'Reports Pending', value: '0', icon: Flag },
    { label: 'Revenue (MTD)', value: '₹0', icon: CreditCard },
    { label: 'Premium %', value: '0%', icon: Shield },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {metrics.map((m) => (
        <div key={m.label} className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <m.icon className="w-5 h-5 text-gray-400 mb-2" />
          <p className="text-2xl font-bold">{m.value}</p>
          <p className="text-xs text-gray-500">{m.label}</p>
        </div>
      ))}
    </div>
  )
}

function AdminUsers() {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-sm">User management interface</p>
      <p className="text-xs mt-1">Search, suspend, ban, and manage users</p>
    </div>
  )
}

function AdminReports() {
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-sm">Report management interface</p>
      <p className="text-xs mt-1">Review, prioritize, and resolve user reports</p>
    </div>
  )
}

function AdminPayments() {
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)

  useEffect(() => {
    loadPayments()
  }, [])

  const loadPayments = async () => {
    setLoading(true)
    const { data } = await paymentService.getAllPendingPayments()
    setPayments(data || [])
    setLoading(false)
  }

  const handleApprove = async (paymentId: string) => {
    setProcessing(paymentId)
    const { error } = await paymentService.approvePayment(paymentId)
    if (error) {
      toast.error('Failed to approve payment')
    } else {
      toast.success('Payment approved! Premium activated.')
      loadPayments()
    }
    setProcessing(null)
  }

  const handleReject = async (paymentId: string) => {
    setProcessing(paymentId)
    const { error } = await paymentService.rejectPayment(paymentId)
    if (error) {
      toast.error('Failed to reject payment')
    } else {
      toast.success('Payment rejected')
      loadPayments()
    }
    setProcessing(null)
  }

  if (loading) {
    return (
      <div className="text-center py-12">
        <Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Pending Payment Verifications</h2>
        <Badge variant="secondary">{payments.length} pending</Badge>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <CreditCard className="w-8 h-8 mx-auto mb-2" />
          <p className="text-sm">No pending payments</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map((payment: any) => (
            <div key={payment.id} className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-medium">{payment.users?.display_name || 'Unknown User'}</p>
                  <p className="text-xs text-gray-500">ID: {payment.users?.unique_id} | {payment.users?.email}</p>
                </div>
                <Badge variant="secondary" className="capitalize">{payment.status}</Badge>
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                <div>
                  <span className="text-gray-500">Plan:</span>{' '}
                  <span className="font-medium">{payment.plan_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span>{' '}
                  <span className="font-medium">₹{payment.amount}</span>
                </div>
                <div>
                  <span className="text-gray-500">Method:</span>{' '}
                  <span className="font-medium capitalize">{payment.payment_method}</span>
                </div>
                <div>
                  <span className="text-gray-500">Date:</span>{' '}
                  <span className="font-medium">{format(new Date(payment.created_at), 'dd MMM yyyy')}</span>
                </div>
                {payment.transaction_id && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Transaction:</span>{' '}
                    <span className="font-medium text-xs">{payment.transaction_id}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => handleApprove(payment.id)}
                  disabled={processing === payment.id}
                >
                  {processing === payment.id ? (
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                  ) : (
                    <CheckCircle className="w-3 h-3 mr-1" />
                  )}
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-red-600 border-red-200 hover:bg-red-50"
                  onClick={() => handleReject(payment.id)}
                  disabled={processing === payment.id}
                >
                  <XCircle className="w-3 h-3 mr-1" />
                  Reject
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default AdminDashboard