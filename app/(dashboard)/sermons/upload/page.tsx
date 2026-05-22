import Link from 'next/link'
import { verifySession } from '@/lib/dal'
import { VideoUpload } from '@/components/video-upload'
import { YouTubeImportForm } from '@/components/youtube-import-form'

export default async function UploadPage() {
  await verifySession()

  return (
    <div className="px-8 py-9 max-w-2xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <p className="section-label mb-2">Sermons</p>
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Upload sermon.
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}>
          Upload a file directly, or paste a YouTube / Facebook URL we&apos;ll download for you. Sunday sermons get daily gardens generated as soon as processing completes.
        </p>
      </div>
      <div className="surface p-6 anim-fadeUp" style={{ animationDelay: '0.1s' }}>
        <VideoUpload />
      </div>

      <div className="mt-8 anim-fadeUp" style={{ animationDelay: '0.15s' }}>
        <h2
          className="text-2xl leading-tight mb-3"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Or import from a URL.
        </h2>
        <div className="surface p-6">
          <YouTubeImportForm />
        </div>
      </div>

      <p
        className="text-xs mt-6 text-center"
        style={{ color: '#A09080', fontFamily: 'var(--font-mulish)' }}
      >
        Importing a backlog from YouTube?{' '}
        <Link href="/sermons/bulk-import" className="underline">
          Bulk import from channel →
        </Link>
      </p>
    </div>
  )
}
