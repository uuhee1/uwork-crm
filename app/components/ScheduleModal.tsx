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

export default function ScheduleModal({ event, statusLabel, depositLabel, onClose }: Props) {
  const router = useRouter()
  const p = event.extendedProps

  const startTime = event.start ? new Date(event.start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  const endTime = event.end ? new Date(event.end).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''
  const dateStr = event.start ? new Date(event.start).toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : ''

  function goToCustomer() {
    router.push(`/search?customer_id=${p.customerId}`)
    onClose()
  }

  const statusColorMap: Record<string, string> = {
    wait: 'bg-yellow-100 text-yellow-800',
    confirmed: 'bg-green-100 text-green-800',
    canceled: 'bg-red-100 text-red-800',
    noshow: 'bg-gray-200 text-gray-700',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* 배경 */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* 모달 */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* 상단 색상 바 */}
        <div className="h-2" style={{ backgroundColor: event.backgroundColor }} />

        <div className="p-6">
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