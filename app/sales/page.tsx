'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'

type SaleRow = {
  id: string
  created_at: string
  shoot_people: number | null
  base_price: number
  total_amount: number
  sale_status: string
  payment_status: string
  package_name: string | null
  customers: { name: string } | null
  schedules: { shoot_date: string } | null
  staff: { name: string } | null
}

const STATUS_LABEL: Record<string, string> = {
  draft: '작성중',
  confirmed: '확정',
  canceled: '취소',
}

const PAYMENT_LABEL: Record<string, string> = {
  pending: '미결제',
  partial: '부분결제',
  paid: '완결',
  refunded: '환불',
}

export default function SalesListPage() {
  const [rows, setRows] = useState<SaleRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data } = await supabase
      .from('sales')
      .select(`
        id, created_at, shoot_people, base_price, total_amount,
        sale_status, payment_status, package_name,
        customers ( name ),
        schedules ( shoot_date ),
        staff ( name )
      `)
      .order('created_at', { ascending: false })
      .limit(100)

    setRows((data as any) || [])
    setLoading(false)
  }

  function fmtDate(iso: string) {
    if (!iso) return '-'
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const yy = String(d.getFullYear()).slice(2)
    return `${yy}.${mm}.${dd}`
  }

  function fmtPrice(n: number) {
    return new Intl.NumberFormat('ko-KR').format(n)
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">판매</h2>
          <Link
            href="/sales/new"
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer"
          >
            + 신규 판매
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          {loading ? (
            <div className="text-center text-gray-400 py-12 text-sm">로딩 중...</div>
          ) : rows.length === 0 ? (
            <div className="text-center text-gray-400 py-12 text-sm">
              판매 기록이 없습니다
            </div>
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
                    <td className="px-4 py-3">{r.schedules?.shoot_date || '-'}</td>
                    <td className="px-4 py-3 font-medium">{r.customers?.name || '-'}</td>
                    <td className="px-4 py-3">{r.package_name || '-'}</td>
                    <td className="px-4 py-3">{r.shoot_people || '-'}</td>
                    <td className="px-4 py-3 text-right font-medium">{fmtPrice(r.total_amount)}원</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.sale_status === 'confirmed' ? 'bg-green-100 text-green-700' :
                        r.sale_status === 'canceled' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-600'
                      }`}>
                        {STATUS_LABEL[r.sale_status] || r.sale_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        r.payment_status === 'paid' ? 'bg-green-100 text-green-700' :
                        r.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-500'
                      }`}>
                        {PAYMENT_LABEL[r.payment_status] || r.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{r.staff?.name || '-'}</td>
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
