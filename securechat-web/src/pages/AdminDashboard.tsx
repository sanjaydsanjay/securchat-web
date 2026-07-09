import { Tabs } from '@/components/ui/tabs'
import { useState } from 'react'
import { Users, Flag, CreditCard, BarChart3, Shield } from 'lucide-react'

export function AdminDashboard() {
  const [tab, setTab] = useState('analytics')

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
  return (
    <div className="text-center py-12 text-gray-400">
      <p className="text-sm">Payment verification interface</p>
      <p className="text-xs mt-1">Verify UPI payments and manage subscriptions</p>
    </div>
  )
}

export default AdminDashboard
