'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

type Staff = {
  id: string
  name: string
  level: number
  group_name: string
}

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const [staff, setStaff] = useState<Staff | null>(null)
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [])

  async function checkAuth() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login'
      return
    }

    const { data } = await supabase
      .from('staff')
      .select('*')
      .eq('auth_user_id', user.id)
      .single()

    if (!data || !data.is_active) {
      await supabase.auth.signOut()
      window.location.href = '/login'
      return
    }

    setStaff(data)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    window.location.href = '/login'
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-400">로딩 중...</p>
      </div>
    )
  }

  const menus = [
    { href: '/search', label: '조회' },
    { href: '/customer-consult', label: '고객/상담' },
    { href: '/schedule', label: '스케줄' },
    { href: '/todo', label: '할일' },
    { href: '/work-status', label: '작업현황' },
    { href: '/links', label: 'LINKS' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-gray-900 text-white px-6 py-3 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-bold text-lg tracking-tight">U-work</Link>
          <nav className="flex gap-1">
            {menus.map(m => (
              <Link
                key={m.href}
                href={m.href}
                className={`px-3 py-2 rounded-lg text-sm transition ${
                  pathname.startsWith(m.href)
                    ? 'bg-white/20 text-white'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                {m.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-white/80">{staff?.name} ({staff?.group_name})</span>
          <button
            onClick={handleLogout}
            className="text-white/50 hover:text-white cursor-pointer"
          >
            로그아웃
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
