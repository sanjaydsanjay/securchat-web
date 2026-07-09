import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaUpload } from '../useMediaUpload'

const mockValidateFile = vi.fn()
const mockBuildMediaPath = vi.fn()
const mockUpload = vi.fn()

vi.mock('@/services/storageService', () => ({
  storageService: {
    validateFile: (...args: unknown[]) => mockValidateFile(...args),
    buildMediaPath: (...args: unknown[]) => mockBuildMediaPath(...args),
    upload: (...args: unknown[]) => mockUpload(...args),
  }
}))

describe('useMediaUpload Hook Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates file size correctly', async () => {
    mockValidateFile.mockReturnValue('File too large. Maximum: 10.0 MB')
    const { result } = renderHook(() => useMediaUpload())

    const largeFile = new File([new ArrayBuffer(60 * 1024 * 1024)], 'huge.mp4', { type: 'video/mp4' })

    let response: any;
    await act(async () => {
      response = await result.current.uploadFile(largeFile, 'test-chat', 'msg-1', 'video')
    })

    expect(response.error).toBeDefined()
    expect(response.error).toMatch(/too large|size/i)
    expect(mockUpload).not.toHaveBeenCalled()
  })

  it('validates unsupported file types', async () => {
    mockValidateFile.mockReturnValue('Invalid file type')
    const { result } = renderHook(() => useMediaUpload())

    const badFile = new File(['hack'], 'virus.exe', { type: 'application/x-msdownload' })

    let response: any;
    await act(async () => {
      response = await result.current.uploadFile(badFile, 'test-chat', 'msg-1', 'document')
    })

    expect(response.error).toBeDefined()
    expect(response.error).toMatch(/unsupported|invalid type|invalid file type/i)
  })

  it('handles successful uploads securely', async () => {
    mockValidateFile.mockReturnValue(null)
    mockBuildMediaPath.mockReturnValue('test-chat/msg-1/image.png')
    mockUpload.mockResolvedValue({ data: { path: 'test-chat/msg-1/image.png', url: 'https://example.com/image.png', signedUrl: 'https://example.com/signed/image.png' }, error: null })

    const { result } = renderHook(() => useMediaUpload())

    const validFile = new File(['content'], 'image.png', { type: 'image/png' })

    let response: any;
    await act(async () => {
      response = await result.current.uploadFile(validFile, 'test-chat', 'msg-1', 'image')
    })

    expect(mockUpload).toHaveBeenCalled()
    expect(response.error).toBeNull()
    expect(response.url).toBeTruthy()
  })

  it('cleans up appropriately on upload failures', async () => {
    mockValidateFile.mockReturnValue(null)
    mockBuildMediaPath.mockReturnValue('test-chat/msg-1/image.png')
    mockUpload.mockResolvedValue({ data: null, error: 'Row level security policy violation' })

    const { result } = renderHook(() => useMediaUpload())
    const validFile = new File(['content'], 'image.png', { type: 'image/png' })

    let response: any;
    await act(async () => {
      response = await result.current.uploadFile(validFile, 'test-chat', 'msg-1', 'image')
    })

    expect(response.error).toBeDefined()
    expect(response.error).toContain('policy violation')
    expect(result.current.uploading).toBe(false)
    expect(result.current.progress).toBe(0)
  })
})
