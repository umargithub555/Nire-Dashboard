import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const adminPublicRoutes = ['/login', '/forgot-password', '/reset-password']
const portalPublicRoutes = ['/portal/login', '/portal/forgot-password', '/portal/reset-password']

export default async function proxy(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  if (path.startsWith('/portal')) {
    const isPortalPublicRoute = portalPublicRoutes.includes(path)
    const isPortalResetRoute = path === '/portal/reset-password'

    if (!user && !isPortalPublicRoute) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }

    if (user && isPortalPublicRoute && !isPortalResetRoute) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    return supabaseResponse
  }

  const isAdminPublicRoute = adminPublicRoutes.includes(path)
  const isAdminResetRoute = path === '/reset-password'

  if (!user && !isAdminPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  if (user && isAdminPublicRoute && !isAdminResetRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
