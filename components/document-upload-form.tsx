'use client'

import { useActionState } from 'react'
import { createDocumentAction } from '@/app/actions/documents'

export function DocumentUploadForm() {
  const [state, action, pending] = useActionState(createDocumentAction, null)

  return (
    <div className="bg-white rounded-xl border border-stone-200 p-5">
      <h3 className="text-sm font-semibold text-stone-800 mb-4">Add Document</h3>
      <form action={action} className="space-y-3">
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Title</label>
          <input
            name="title"
            required
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            placeholder="Statement of Faith"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-stone-600 mb-1">Content</label>
          <textarea
            name="content"
            required
            rows={6}
            className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-y"
            placeholder="Paste document text here…"
          />
        </div>

        {state?.error && (
          <p className="text-xs text-red-600">{state.error}</p>
        )}
        {state?.success && (
          <p className="text-xs text-emerald-700">Document added successfully.</p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50 transition-colors"
        >
          {pending ? 'Adding…' : 'Add Document'}
        </button>
      </form>
    </div>
  )
}
