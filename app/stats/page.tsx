'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import { useRouter } from 'next/navigation'

type SaleRow = {
  id: string
  created_at: string
  shoot_people: number | null
  base_price: number
  total_amount: number
  sale_status: string
  payment_status: string
  package_name: string | null
  package_code: string | null
  customers: { name: string } | null
  schedules: { shoot_date: string; shoot_types: { label: string; code: string } | null } | null
  staff: { name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  draft: '작성중', confirmed: '확정', canceled: '취소',
}
const PAYMENT_LABEL: Record<string, string> = {
  pending: '미결제', partial: '부분결제', paid: '완결', refunded: '환불',
}

const fmtPrice = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

export default function StatsPage() {
  const router = useRouter()
  const [rows, setRows] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)
  const [staffLevel, setStaffLevel] = useState(0)

  // 필터
  const [paymentFilter, setPaymentFilter] = useState<string>('all')
  const [periodType, setPeriodType] = useState<'month' | 'custom'>('month')
  const [selectedMonth, setSelectedMonth] = useState(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  useEffect(() => {
    loadInit()
  }, [])

  useEffect(() => {
    if (staffLevel > 0) loadSales()
  }, [paymentFilter, selectedMonth, dateFrom, dateTo, periodType, staffLevel])

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staff } = await supabase.from('staff').select('id, level').eq('auth_user_id', user.id).single()
      if (staff) {
        setStaffLevel(staff.level || 0)
        if ((staff.level || 0) < 90) {
          router.push('/')
          return
        }
      }
    }
  }

  async function loadSales() {
    setLoading(true)

    let query = supabase
      .from('sales')
      .select(`
        id, created_at, shoot_people, base_price, total_amount,
        sale_status, payment_status, package_name, package_code,
        customers ( name ),
        schedules ( shoot_date, shoot_types:shoot_type_id ( label, code ) ),
        staff ( name )
      `)
      .order('created_at', { ascending: false })

    if (periodType === 'month' && selectedMonth) {
      const [y, m] = selectedMonth.split('-').map(Number)
      const from = new Date(y, m - 1, 1).toISOString()
      const to = new Date(y, m, 0, 23, 59, 59).toISOString()
      query = query.gte('created_at', from).lte('created_at', to)
    } else if (periodType === 'custom' && dateFrom && dateTo) {
      query = query.gte('created_at', `${dateFrom}T00:00:00`).lte('created_at', `${dateTo}T23:59:59`)
    }

    if (paymentFilter === 'unpaid') {
      query = query.in('payment_status', ['pending', 'partial'])
    } else if (paymentFilter !== 'all') {
      query = query.eq('payment_status', paymentFilter)
    }

    const { data } = await query.limit(500)
    setRows((data as any) || [])
    setLoading(false)
  }

  function fmtDate(iso: string) {
    if (!iso) return '-'
    const d = new Date(iso)
    return `${String(d.getFullYear()).slice(2)}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
  }

  const confirmedRows = rows.filter(r => r.sale_status === 'confirmed')
  const totalAmount = confirmedRows.reduce((s, r) => s + r.total_amount, 0)
  const totalCount = confirmedRows.length

  // 상품별 집계
  const packageStats = confirmedRows.reduce((acc, r) => {
    const pkg = r.package_name || '(단품)'
    if (!acc[pkg]) acc[pkg] = { count: 0, amount: 0 }
    acc[pkg].count++
    acc[pkg].amount += r.total_amount
    return acc
  }, {} as Record<string, { count: number; amount: number }>)

  // 촬영종류별 집계
  const categoryStats = confirmedRows.reduce((acc, r) => {
    const cat = (r.schedules as any)?.shoot_types?.label || '(미분류)'
    if (!acc[cat]) acc[cat] = { count: 0, amount: 0 }
    acc[cat].count++
    acc[cat].amount += r.total_amount
    return acc
  }, {} as Record<string, { count: number; amount: number }>)

  if (staffLevel > 0 && staffLevel < 90) {
    return <MainLayout><div className="p-12 text-center text-gray-400">접근 권한이 없습니다.</div></MainLayout>
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <h2 className="text-xl font-bold mb-4">통계</h2>

        {/* 필터 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setPeriodType('month')}
                className={`px-3 py-1.5 text-xs rounded-md cursor-pointer ${periodType === 'month' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500'}`}>
                월별
              </button>
              <button onClick={() => setPeriodType('custom')}
                className={`px-3 py-1.5 text-xs rounded-md cursor-pointer ${periodType === 'custom' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500'}`}>
                기간선택
              </button>
            </div>

            {periodType === 'month' ? (
              <input type="month" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" />
            ) : (
              <div className="flex items-center gap-1">
                <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs" />
                <span className="text-gray-400 text-xs">~</span>
                <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                  className="px-2 py-1.5 border border-gray-200 rounded-lg text-xs" />
              </div>
            )}

            <div className="w-px h-6 bg-gray-200" />

            <div className="flex gap-1">
              {[
                { value: 'all', label: '전체' },
                { value: 'unpaid', label: '미결제' },
                { value: 'paid', label: '완결' },
              ].map(f => (
                <button key={f.value} onClick={() => setPaymentFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    paymentFilter === f.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="ml-auto text-sm text-gray-400">
              {loading ? '로딩 중...' : `${rows.length}건`}
            </div>
          </div>
        </div>

        {/* 통계 카드 */}
        {!loading && confirmedRows.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="flex items-center gap-6 mb-4">
                <div>
                  <div className="text-xs text-gray-500">확정 판매</div>
                  <div className="text-2xl font-bold">{totalCount}건</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">총액</div>
                  <div className="text-2xl font-bold">{fmtPrice(totalAmount)}원</div>
                </div>
              </div>
              <div className="text-xs text-gray-500 mb-2">상품별</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(packageStats).sort((a, b) => b[1].amount - a[1].amount).map(([pkg, stat]) => (
                  <div key={pkg} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                    <div className="font-medium text-gray-900">{pkg}</div>
                    <div className="text-gray-500 mt-0.5">{stat.count}건 · {fmtPrice(stat.amount)}원</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <div className="text-xs text-gray-500 mb-3">촬영종류별</div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(categoryStats).sort((a, b) => b[1].amount - a[1].amount).map(([cat, stat]) => (
                  <div key={cat} className="bg-gray-50 rounded-lg px-3 py-2 text-xs">
                    <div className="font-medium text-gray-900">{cat}</div>
                    <div className="text-gray-500 mt-0.5">{stat.count}건 · {fmtPrice(stat.amount)}원</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 테이블 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center text-gray-400 py-12 text-sm">로딩 중...</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">판매 기록이 없습니다</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600">판매일</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">촬영일</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">고객</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">상품</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">인원</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">금액</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">상태</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600">결제</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">담당</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                    <td className="px-4 py-3 text-gray-500">{fmtDate(r.created_at)}</td>
                    <td className="px-4 py-3">{(r.schedules as any)?.shoot_date || '-'}</td>
                    <td className="px-4 py-3 font-medium">{(r.customers as any)?.name || '-'}</td>
                    <td className="px-4 py-3">{r.package_name || '-'}</td>
                    <td className="px-4 py-3">{r.shoot_people || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtPrice(r.total_amount)}원</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.sale_status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        r.sale_status === 'canceled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>{STATUS_LABEL[r.sale_status] || r.sale_status}</span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        r.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>{PAYMENT_LABEL[r.payment_status] || r.payment_status}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{(r.staff as any)?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </MainLayout>
  )
}