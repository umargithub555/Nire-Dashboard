import { createServerClient } from '@supabase/ssr'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { NextResponse, type NextRequest } from 'next/server'

const adminPublicRoutes = ['/app', '/login', '/forgot-password', '/reset-password']
const portalPublicRoutes = ['/portal/login', '/portal/forgot-password', '/portal/reset-password']

async function isEmployeeUser(userId: string) {
  const service = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await service
    .from('employees')
    .select('id')
    .eq('auth_user_id', userId)
    .maybeSingle()

  if (error) {
    return false
  }

  return !!data
}

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
  const isApiRoute = path.startsWith('/api/')
  const isPortalRoute = path.startsWith('/portal') || path.startsWith('/api/portal')
  const isPortalPublicRoute = portalPublicRoutes.includes(path)
  const isAdminPublicRoute = adminPublicRoutes.includes(path)
  const isPortalResetRoute = path === '/portal/reset-password'
  const isAdminResetRoute = path === '/reset-password'

  if (!user && path === '/') {
    return NextResponse.redirect(new URL('/app', request.url))
  }

  if (!user) {
    if (isPortalRoute && !isPortalPublicRoute) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }

    if (!isPortalRoute && !isAdminPublicRoute) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    return supabaseResponse
  }

  const employeeUser = await isEmployeeUser(user.id)

  if (path === '/app') {
    return NextResponse.redirect(new URL(employeeUser ? '/portal' : '/', request.url))
  }

  if (isPortalRoute) {
    if (!employeeUser) {
      if (isApiRoute) {
        return NextResponse.json({ error: 'Portal access is restricted to employees.' }, { status: 403 })
      }
      return NextResponse.redirect(new URL('/login', request.url))
    }

    if (isPortalPublicRoute && !isPortalResetRoute) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    return supabaseResponse
  }

  if (employeeUser) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Admin access is restricted.' }, { status: 403 })
    }

    if (!isAdminPublicRoute) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }

    if (isAdminPublicRoute && !isAdminResetRoute) {
      return NextResponse.redirect(new URL('/portal', request.url))
    }
  } else if (isAdminPublicRoute && !isAdminResetRoute) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|json|woff|woff2)$).*)',
  ],
}
