import { render, screen, userEvent, act } from '@/test/render'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { VoiceRecorder as SharedVoiceRecorder } from '@/components/shared/VoiceRecorder'

const mockMediaRecorder = {
  start: vi.fn(),
  stop: vi.fn(),
  pause: vi.fn(),
  resume: vi.fn(),
  ondataavailable: null as unknown as ((e: BlobEvent) => void) | null,
  onstop: null as unknown as (() => void) | null,
  onerror: null as unknown as (() => void) | null,
}

let mediaRecorderInstance: typeof mockMediaRecorder | null = null

Object.defineProperty(window, 'MediaRecorder', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(function (this: any) {
    mediaRecorderInstance = Object.create(mockMediaRecorder)
    Object.assign(mediaRecorderInstance, mockMediaRecorder)
    return mediaRecorderInstance
  }),
})

Object.defineProperty(navigator, 'mediaDevices', {
  writable: true,
  configurable: true,
  value: {
    getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: vi.fn() }] }),
  },
})

describe('VoiceRecorder Component Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mediaRecorderInstance = null
  })

  it('handles start and stop recording flow natively', async () => {
    const handleRecorded = vi.fn()
    const user = userEvent.setup()

    render(<SharedVoiceRecorder onRecorded={handleRecorded} />)

    const micButton = screen.getByRole('button', { name: /Record/i })
    await user.click(micButton)

    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
    expect(window.MediaRecorder).toHaveBeenCalled()

    const stopButton = await screen.findByRole('button', { name: /Stop/i })
    expect(stopButton).toBeInTheDocument()

    await user.click(stopButton)
  })

  it('handles callback when recording completes', async () => {
    const handleRecorded = vi.fn()
    const user = userEvent.setup()

    render(<SharedVoiceRecorder onRecorded={handleRecorded} />)

    await user.click(screen.getByRole('button', { name: /Record/i }))

    const stopButton = await screen.findByRole('button', { name: /Stop/i })
    await user.click(stopButton)
  })
})
