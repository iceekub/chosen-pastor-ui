import { verifySession } from '@/lib/dal'
import { VideoUpload } from '@/components/video-upload'

export default async function UploadPage() {
  await verifySession()

  return (
    <div className="px-8 py-9 max-w-3xl mx-auto">
      <div className="mb-8 anim-fadeUp">
        <p className="section-label mb-2">Sermons</p>
        <h1
          className="text-4xl leading-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#2C1E0F', fontStyle: 'italic' }}
        >
          Upload sermon.
        </h1>
        <p className="text-sm mt-1" style={{ color: '#7A6A58', fontFamily: 'var(--font-mulish)' }}>
          Videos are uploaded directly to S3 and processed automatically.
        </p>
      </div>
      <div className="surface p-6 anim-fadeUp" style={{ animationDelay: '0.1s' }}>
        <VideoUpload />
      </div>
    </div>
  )
}
