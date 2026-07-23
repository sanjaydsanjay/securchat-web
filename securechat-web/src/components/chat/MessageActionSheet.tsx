import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Pencil, Trash2, Ban, Star, Info, Reply, Copy, Forward, X, Shield, ShieldOff } from 'lucide-react'
import { useBlock } from '@/hooks/useBlock'
import type { Message } from '@/types/message'

interface MessageActionSheetProps {
  open: boolean
  message: Message | null
  isOwn: boolean
  onClose: () => void
  onReply: (message: Message) => void
  onCopy: (message: Message) => void
  onForward: (message: Message) => void
  onEdit: (message: Message) => void
  onDelete: (message: Message, forEveryone: boolean) => void
  onStar: (message: Message) => void
  onInfo: (message: Message) => void
}

const spring = { type: 'spring' as const, damping: 32, stiffness: 320 }
const backdrop = { type: 'tween' as const, duration: 0.25 }

export function MessageActionSheet({
  open,
  message,
  isOwn,
  onClose,
  onReply,
  onCopy,
  onForward,
  onEdit,
  onDelete,
  onStar,
  onInfo,
}: MessageActionSheetProps) {
  const [confirmDelete, setConfirmDelete] = useState<null | boolean>(null)
  const { blockUser, unblockUser, isBlocked } = useBlock()
  const senderBlocked = message && !isOwn && isBlocked(message.sender_unique_id)

  const close = useCallback(() => {
    setConfirmDelete(null)
    onClose()
  }, [onClose])

  const handleAction = useCallback(
    (fn: (m: Message) => void) => {
      if (!message) return
      fn(message)
      setConfirmDelete(null)
      onClose()
    },
    [message, onClose],
  )

  const handleDeleteConfirm = useCallback(() => {
    if (!message || confirmDelete === null) return
    onDelete(message, confirmDelete)
    setConfirmDelete(null)
    onClose()
  }, [message, confirmDelete, onDelete, onClose])

  return (
    <AnimatePresence>
      {open && message && (
        <motion.div
          className="fixed inset-0 z-[200] flex items-end justify-center md:hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={backdrop}
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={close}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            className="relative w-full max-w-[640px] h-[47vh] max-h-[50vh] bg-white dark:bg-gray-900 rounded-t-[24px] shadow-2xl flex flex-col overflow-hidden"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={spring}
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.5 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 110 || info.velocity.y > 600) close()
            }}
          >
            <div className="flex justify-center pt-3 pb-1 cursor-grab active:cursor-grabbing">
              <div className="w-10 h-1.5 rounded-full bg-gray-300 dark:bg-gray-600" />
            </div>

            {confirmDelete === null ? (
              <div className="flex-1 overflow-y-auto">
                <div className="px-5 py-3 border-b border-gray-100 dark:border-gray-800">
                  <p className="text-[11px] uppercase tracking-wide text-[#8a99a8]">Message</p>
                  <p className="text-sm text-[#2b3a4a] dark:text-gray-200 truncate">
                    {message.content || (message.media_url ? 'Media message' : 'Message')}
                  </p>
                </div>

                <SheetItem icon={<Reply className="w-5 h-5" />} label="Reply" onClick={() => handleAction(onReply)} />
                <SheetItem icon={<Copy className="w-5 h-5" />} label="Copy" onClick={() => handleAction(onCopy)} />
                <SheetItem icon={<Forward className="w-5 h-5" />} label="Forward" onClick={() => handleAction(onForward)} />
                {isOwn && (
                  <SheetItem icon={<Pencil className="w-5 h-5" />} label="Edit" onClick={() => handleAction(onEdit)} />
                )}
                {isOwn && (
                  <SheetItem icon={<Trash2 className="w-5 h-5 text-red-500" />} label="Delete for Me" danger onClick={() => setConfirmDelete(false)} />
                )}
                {isOwn && (
                  <SheetItem icon={<Ban className="w-5 h-5 text-red-500" />} label="Delete for Everyone" danger onClick={() => setConfirmDelete(true)} />
                )}
                <SheetItem icon={<Star className="w-5 h-5" />} label="Star" onClick={() => handleAction(onStar)} />
                <SheetItem icon={<Info className="w-5 h-5" />} label="Info" onClick={() => handleAction(onInfo)} />
                {!isOwn && (
                  senderBlocked ? (
                    <SheetItem icon={<ShieldOff className="w-5 h-5" />} label="Unblock User" onClick={() => { if (message) { unblockUser(message.sender_unique_id); close() } }} />
                  ) : (
                    <SheetItem icon={<Shield className="w-5 h-5 text-red-500" />} label="Block User" danger onClick={() => { if (message) { blockUser(message.sender_unique_id); close() } }} />
                  )
                )}
                <button
                  onClick={close}
                  className="w-full flex items-center justify-center gap-2 px-5 py-3.5 text-sm font-medium text-[#2b3a4a] dark:text-gray-200 border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex-1 flex flex-col p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-semibold text-[#2b3a4a] dark:text-gray-100">
                    {confirmDelete ? 'Delete for everyone?' : 'Delete for me?'}
                  </h3>
                  <button onClick={() => setConfirmDelete(null)} className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800">
                    <X className="w-5 h-5 text-[#8a99a8]" />
                  </button>
                </div>
                <p className="text-sm text-[#8a99a8] mb-6">
                  {confirmDelete
                    ? 'This message will be removed for everyone in this chat. This action cannot be undone.'
                    : 'This message will be removed from your view only.'}
                </p>
                <button
                  onClick={handleDeleteConfirm}
                  className="w-full py-3.5 rounded-xl bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors"
                >
                  Delete
                </button>
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="w-full py-3.5 mt-2 rounded-xl bg-gray-100 dark:bg-gray-800 text-[#2b3a4a] dark:text-gray-200 text-sm font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function SheetItem({
  icon,
  label,
  onClick,
  danger,
}: {
  icon: React.ReactNode
  label: string
  onClick: () => void
  danger?: boolean
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm transition-colors ${
        danger
          ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
          : 'text-[#2b3a4a] dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800'
      }`}
    >
      {icon}
      {label}
    </button>
  )
}
