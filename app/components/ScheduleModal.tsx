'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  extendedProps: {
    scheduleId: string
    customerId: string
    customerName: string
    shootType: string
    peopleCount: number
    status: string
    depositStatus: string
    memo: string | null
    staffName: string | null
  }
}

type SaleItem = {
  id: string
  package_name: string | null
  total_amount: number
  sale_status: string
  payment_status: string
  created_at: string
}

type Props = {
  event: CalendarEvent
  statusLabel: Record<string, string>
  depositLabel: Record<string, string>
  onClose: () => void
}

const SALE_STATUS_LABEL: Record<string, string> = {
  draft: '작성중',
  confirmed: '확정',
  canceled: '취소',
}

const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: '미결제',
  partial: '일부결제',
  paid: '결제완료',
  refunded: '환불',
}

const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-red-100 text-red-700',
}

export default function ScheduleModal({ event, statusLabel, depositLabel, onClose }: Props) {
  const router = useRouter()
  const p = event.extendedProps

  const [sales, setSales] = useState<SaleItem[]>([])
  const [salesLoading, setSalesLoading] = useState(true)

  const startTime = event.start ? new Date(event.start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  const endTime = event.end ? new Date(event.end).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  const dateStr = event.start ? new Date(event.start).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : ''

  // 판매 목록 로드
  useEffect(() => {
    async function loadSales() {
      setSalesLoading(true)
      const { data } = await supabase
        .from('sales')
        .select('id, package_name, total_amount, sale_status, payment_status, created_at')
        .eq('schedule_id', p.scheduleId)
        .order('created_at', { ascending: false })

      if (data) setSales(data as SaleItem[])
      setSalesLoading(false)
    }
    if (p.scheduleId) loadSales()
  }, [p.scheduleId])

  function goToCustomer() {
    router.push(`/search?customer_id=${p.customerId}`)
    onClose()
  }

  function goToNewSale() {
    router.push(`/sales/new?schedule_id=${p.scheduleId}`)
    onClose()
  }

  // 판매 row 클릭 — 일단 고객 상세로 이동 (판매 상세 페이지 만들면 그쪽으로 변경)
  function goToSale(saleId: string) {
    router.push(`/search?customer_id=${p.customerId}`)
    onClose()
  }

  const statusColorMap: Record<string, string> = {
    wait: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800',
    noshow: 'bg-gray-200 text-gray-700',
  }

  const formatPrice = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* 상단 색상 바 */}
        <div className="h-2 flex-shrink-0" style={{ backgroundColor: event.backgroundColor }} />

        <div className="p-6 overflow-y-auto">
          {/* 촬영종류 + 고객명 */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold">{p.shootType} {p.peopleCount}인</h3>
              <button
                onClick={goToCustomer}
                className="text-blue-600 hover:underline text-sm mt-0.5 cursor-pointer"
              >
                {p.customerName} →
              </button>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* 날짜/시간 */}
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3">
              <span className="text-gray-400 w-16">날짜</span>
              <span className="font-medium">{dateStr}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 w-16">시간</span>
              <span className="font-medium">{startTime} ~ {endTime}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-gray-400 w-16">상태</span>
              <div className="flex gap-1.5">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${statusColorMap[p.status] || 'bg-gray-100'}`}>
                  {statusLabel[p.status] || p.status}
                </span>
                <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                  {depositLabel[p.depositStatus] || p.depositStatus}
                </span>
              </div>
            </div>
            {p.staffName && (
              <div className="flex items-center gap-3">
                <span className="text-gray-400 w-16">담당</span>
                <span>{p.staffName}</span>
              </div>
            )}
            {p.memo && (
              <div className="flex items-start gap-3">
                <span className="text-gray-400 w-16">메모</span>
                <span className="text-gray-700">{p.memo}</span>
              </div>
            )}
          </div>

          {/* 판매 섹션 */}
          <div className="mt-6 pt-5 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-semibold text-gray-700">
                판매 {sales.length > 0 && <span className="text-gray-400 font-normal">({sales.length})</span>}
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={goToNewSale}
                  className="text-xs px-2.5 py-1 bg-purple-600 text-white rounded-md hover:bg-purple-700 cursor-pointer"
                >
                  + 판매 등록
                </button>
                <button
                  onClick={goToCustomer}
                  className="text-xs px-2.5 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 cursor-pointer"
                >
                  + 상담/할일
                </button>
              </div>
            </div>

            {salesLoading ? (
              <div className="text-xs text-gray-400 py-2">로딩 중...</div>
            ) : sales.length === 0 ? (
              <div className="text-xs text-gray-400 py-2">아직 판매가 없습니다</div>
            ) : (
              <div className="space-y-1.5">
                {sales.map(s => (
                  <button
                    key={s.id}
                    onClick={() => goToSale(s.id)}
                    className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-gray-900 truncate">
                          {s.package_name || '(상품 미지정)'}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-1.5">
                          <span>{formatPrice(s.total_amount)}원</span>
                          {s.sale_status === 'draft' && (
                            <span className="px-1.5 py-0.5 rounded bg-gray-200 text-gray-700 text-[10px]">
                              {SALE_STATUS_LABEL[s.sale_status]}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[11px] font-medium flex-shrink-0 ${PAYMENT_STATUS_COLOR[s.payment_status] || 'bg-gray-100 text-gray-700'}`}>
                        {PAYMENT_STATUS_LABEL[s.payment_status] || s.payment_status}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="flex gap-2 mt-6">
            <button
              onClick={goToCustomer}
              className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 cursor-pointer"
            >
              고객 상세 보기
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}