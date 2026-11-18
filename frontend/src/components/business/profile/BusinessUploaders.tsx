import { businessApi } from '../../../api/businessApi'
import { ImageUploader, type PendingImages } from '../../ui/Widgets'
import type { BusinessDetail } from '../../../types/business'

/** Logo / cover chosen while creating a business; uploaded right after the first save. */
export interface PendingBusinessImages {
  logo: File | null
  cover: File | null
}

const hold = (file: File | null, onChange: (file: File | null) => void): PendingImages => ({
  files: file ? [file] : [],
  onChange: (files) => onChange(files[0] ?? null),
})

interface UploaderProps {
  business: BusinessDetail | null
  onChange: (b: BusinessDetail) => void
  /** Used while the business doesn't exist yet (create mode). */
  pendingFile?: File | null
  onPendingChange?: (file: File | null) => void
}

/** Square logo uploader. Before the business is saved, the chosen image is held and uploaded on save. */
export function BusinessLogoUploader({ business, onChange, pendingFile = null, onPendingChange }: UploaderProps) {
  return (
    <ImageUploader
      label="Business logo"
      hint="Square image works best · JPG, PNG or WEBP · up to 5 MB"
      aspect="square"
      currentUrl={business?.logoUrl}
      pending={!business && onPendingChange ? hold(pendingFile, onPendingChange) : undefined}
      upload={async (files, onProgress) => onChange(await businessApi.uploadLogo(business!.id, files[0]!, onProgress))}
      onRemove={business?.logoUrl ? async () => onChange(await businessApi.removeLogo(business.id)) : undefined}
    />
  )
}

/** Wide cover image uploader shown at the top of the storefront. */
export function BusinessCoverUploader({ business, onChange, pendingFile = null, onPendingChange }: UploaderProps) {
  return (
    <ImageUploader
      label="Cover image"
      hint="Landscape photo of your shop or products · up to 5 MB"
      aspect="banner"
      currentUrl={business?.coverUrl}
      pending={!business && onPendingChange ? hold(pendingFile, onPendingChange) : undefined}
      upload={async (files, onProgress) => onChange(await businessApi.uploadCover(business!.id, files[0]!, onProgress))}
      onRemove={business?.coverUrl ? async () => onChange(await businessApi.removeCover(business.id)) : undefined}
    />
  )
}
