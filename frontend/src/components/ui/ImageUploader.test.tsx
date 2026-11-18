import { describe, expect, it, vi } from 'vitest'
import { useState } from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ImageUploader } from './Widgets'

// jsdom has no object URLs or image decoding; optimizeImage falls back to the original file for small files.
URL.createObjectURL = vi.fn(() => `blob:preview-${Math.random()}`)
URL.revokeObjectURL = vi.fn()

const photo = (name: string, type = 'image/png') => new File(['x'], name, { type })

function PendingHarness({ multiple = false, onUpload }: { multiple?: boolean; onUpload: () => Promise<void> }) {
  const [files, setFiles] = useState<File[]>([])
  return (
    <>
      <ImageUploader label="Photos" multiple={multiple} upload={onUpload} pending={{ files, onChange: setFiles, max: 3 }} />
      <output data-testid="held">{files.map((f) => f.name).join(',')}</output>
    </>
  )
}

describe('ImageUploader before the first save', () => {
  it('holds chosen photos instead of uploading, and lets you remove them', async () => {
    const upload = vi.fn()
    render(<PendingHarness multiple onUpload={upload} />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, [photo('a.png'), photo('b.png')])

    await waitFor(() => expect(screen.getByTestId('held')).toHaveTextContent('a.png,b.png'))
    expect(upload).not.toHaveBeenCalled()
    expect(screen.getByText(/2 photos will upload when you save/i)).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: /remove photo 1/i }))
    expect(screen.getByTestId('held')).toHaveTextContent('b.png')
  })

  it('caps held photos at the maximum', async () => {
    render(<PendingHarness multiple onUpload={vi.fn()} />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, [photo('1.png'), photo('2.png'), photo('3.png'), photo('4.png')])
    await waitFor(() => expect(screen.getByTestId('held')).toHaveTextContent('1.png,2.png,3.png'))
  })

  it('still rejects files that are not images', async () => {
    render(<PendingHarness onUpload={vi.fn()} />)
    const input = document.querySelector('input[type=file]') as HTMLInputElement
    await userEvent.upload(input, photo('notes.gif', 'image/gif'), { applyAccept: false })
    expect(await screen.findByRole('alert')).toHaveTextContent(/JPG, PNG or WEBP/)
    expect(screen.getByTestId('held')).toHaveTextContent('')
  })

  it('uploads immediately when the record already exists', async () => {
    const upload = vi.fn().mockResolvedValue(undefined)
    render(<ImageUploader label="Logo" upload={upload} />)
    await userEvent.upload(document.querySelector('input[type=file]') as HTMLInputElement, photo('logo.png'))
    await waitFor(() => expect(upload).toHaveBeenCalledWith([expect.any(File)], expect.any(Function)))
  })
})
