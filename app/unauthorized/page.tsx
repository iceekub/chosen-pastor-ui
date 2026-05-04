import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-stone-50 px-4">
      <div className="max-w-md w-full text-center space-y-6">
        <h1 className="font-playfair text-3xl text-stone-800">
          Pastor Portal
        </h1>
        <div className="bg-white rounded-2xl border border-stone-200 shadow-sm p-8 space-y-4">
          <p className="text-stone-700 text-lg font-medium">
            Access restricted
          </p>
          <p className="text-stone-500 text-sm leading-relaxed">
            This portal is for pastors, staff, and administrators only.
            Your account does not have access to this application.
          </p>
          <p className="text-stone-500 text-sm">
            If you believe this is a mistake, please contact your church
            administrator.
          </p>
        </div>
        <Link
          href="/login"
          className="inline-block text-sm text-stone-500 hover:text-stone-700 underline underline-offset-4 transition-colors"
        >
          Sign in with a different account
        </Link>
      </div>
    </main>
  )
}
