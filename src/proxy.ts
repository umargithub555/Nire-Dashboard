// import { createServerClient } from '@supabase/ssr'
// import { NextResponse, type NextRequest } from 'next/server'

// export async function proxy(request: NextRequest) {
//   let supabaseResponse = NextResponse.next({ request })

//   const supabase = createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     {
//       cookies: {
//         getAll() { return request.cookies.getAll() },
//         setAll(cookiesToSet) {
//           cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
//           supabaseResponse = NextResponse.next({ request })
//           cookiesToSet.forEach(({ name, value, options }) =>
//             supabaseResponse.cookies.set(name, value, {
//               ...options,
//               maxAge: 7200, // 2 hours inactivity timeout
//             })
//           )
//         },
//       },
//     }
//   )

//   const { data: { user } } = await supabase.auth.getUser()

//   const isAuthPage = request.nextUrl.pathname.startsWith('/login')
//   const isDashboard = !isAuthPage

//   if (!user && isDashboard) {
//     return NextResponse.redirect(new URL('/login', request.url))
//   }

//   if (user && isAuthPage) {
//     return NextResponse.redirect(new URL('/', request.url))
//   }

//   return supabaseResponse
// }

// export const config = {
//   matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
// }


import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Using default export can bypass strict named-parsing bugs in Next's compiler
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

  // Explicitly await the user data safely
  const { data: { user } } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  // 1. Portal Route Guards
  if (path.startsWith('/portal')) {
    if (path === '/portal/login') {
      if (user) {
        return NextResponse.redirect(new URL('/portal', request.url))
      }
      return supabaseResponse
    }
    
    if (!user) {
      return NextResponse.redirect(new URL('/portal/login', request.url))
    }
    return supabaseResponse
  }

  // 2. Admin Dashboard Route Guards
  const isLoginPage = path === '/login'
  if (!user && !isLoginPage) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}