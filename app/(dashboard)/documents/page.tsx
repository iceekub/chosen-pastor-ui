import { getDocuments } from '@/lib/api/documents'
import { verifySession } from '@/lib/dal'
import { DocumentUploadForm } from '@/components/document-upload-form'

export default async function DocumentsPage() {
  const user = await verifySession()
  const documents = await getDocuments(user.church_id).catch(() => [])

  return (
    <div className="px-8 py-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-stone-900">Documents</h1>
        <p className="text-stone-500 mt-1 text-sm">
          Reference documents uploaded here are used to inform the AI&apos;s responses to your congregation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Document list */}
        <div className="lg:col-span-2">
          {documents.length === 0 ? (
            <div className="bg-white rounded-xl border border-dashed border-stone-300 px-8 py-12 text-center">
              <p className="text-stone-400 text-sm">No documents yet.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-stone-50 border-b border-stone-200">
                  <tr>
                    <th className="text-left px-5 py-3 font-medium text-stone-500">Title</th>
                    <th className="text-left px-5 py-3 font-medium text-stone-500">Added</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {documents.map((doc) => (
                    <tr key={doc.id} className="hover:bg-stone-50">
                      <td className="px-5 py-3.5 font-medium text-stone-900">{doc.title}</td>
                      <td className="px-5 py-3.5 text-stone-400">
                        {new Date(doc.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Upload form */}
        <div>
          <DocumentUploadForm />
        </div>
      </div>
    </div>
  )
}
