import { MessageSquare, Shield } from 'lucide-react'

export function EmptyChatState() {
  return (
    <div className="h-full flex flex-col items-center justify-center text-[#8a99a8] px-6">
      <div className="w-16 h-16 md:w-24 md:h-24 rounded-[20px] md:rounded-[28px] bg-black/[0.03] flex items-center justify-center mb-4 md:mb-6">
        <MessageSquare className="w-8 h-8 md:w-10 md:h-10 text-black/40" />
      </div>
      <h2 className="text-xl md:text-2xl font-bold text-[#2b3a4a] mb-1 tracking-tight">SecureChat AI</h2>
      <p className="text-sm text-[#8a99a8] mb-1">Select a chat to start messaging</p>
      <p className="text-xs text-[#8a99a8]/60">Search for users by their 6-digit Unique ID</p>
      <div className="flex items-center gap-2 mt-6 md:mt-8 px-4 py-2 rounded-[20px] bg-gray-100">
        <Shield className="w-3.5 h-3.5" />
        <span className="text-[12px] font-medium">End-to-end encrypted</span>
      </div>
    </div>
  )
}
