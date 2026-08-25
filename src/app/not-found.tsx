import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-6xl font-bold text-blue-600">404</h1>
        <h2 className="mt-4 text-2xl font-semibold text-slate-900">Page Not Found</h2>
        <p className="mt-2 text-slate-600">The page you are looking for does not exist or has been moved.</p>
        <div className="mt-6">
          <Link
            href="/employees"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none"
          >
            Back to Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}

