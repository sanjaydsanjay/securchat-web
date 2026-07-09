import { render, screen, fireEvent } from '@/test/render'
import { describe, it, expect, vi } from 'vitest'
import { MediaPicker } from '../MediaPicker'

describe('MediaPicker Component Tests', () => {
  it('renders correctly and accepts valid image selections', () => {
    const handleSelect = vi.fn()
    render(<MediaPicker contentType="image" onSelect={handleSelect}><button>Pick</button></MediaPicker>)

    const fileInput = screen.getByTestId('media-picker-input')
    const file = new File(['hello'], 'hello.png', { type: 'image/png' })

    fireEvent.change(fileInput, { target: { files: [file] } })

    expect(handleSelect).toHaveBeenCalledTimes(1)
    expect(handleSelect).toHaveBeenCalledWith(file)
  })

  it('rejects invalid file formats visually', () => {
    const handleSelect = vi.fn()
    render(<MediaPicker contentType="image" onSelect={handleSelect}><button>Pick</button></MediaPicker>)

    const fileInput = screen.getByTestId('media-picker-input')
    const badFile = new File(['hack'], 'script.js', { type: 'text/javascript' })

    fireEvent.change(fileInput, { target: { files: [badFile] } })

    expect(handleSelect).not.toHaveBeenCalled()
  })
})
