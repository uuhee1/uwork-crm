'use client'

import { useEffect, useRef } from 'react'

export type Delivery = {
  _tmp_id: string
  recipient_name: string
  phone: string
  postal_code: string
  address_main: string
  address_detail: string
  memo: string
  is_pickup: boolean
}

type Props = {
  deliveries: Delivery[]
  customerName?: string
  customerPhone?: string | null
  onAdd: () => void
  onUpdate: (tmpId: string, patch: Partial<Delivery>) => void
  onDelete: (tmpId: string) => void
  isPickup: boolean
  onTogglePickup: (v: boolean) => void
}

// Daum 우편번호 API 로드 (전역 스크립트)
declare global {
  interface Window {
    daum?: any
  }
}

export default function Step4Delivery({
  deliveries,
  customerName,
  customerPhone,
  onAdd,
  onUpdate,
  onDelete,
  isPickup,
  onTogglePickup,
}: Props) {
  const scriptLoaded = useRef(false)

  useEffect(() => {
    if (scriptLoaded.current) return
    if (typeof window === 'undefined') return
    if (window.daum) { scriptLoaded.current = true; return }

    const script = document.createElement('script')
    script.src = 'https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js'
    script.async = true
    script.onload = () => { scriptLoaded.current = true }
    document.head.appendChild(script)
  }, [])

  function openAddressSearch(tmpId: string) {
    if (!window.daum?.Postcode) {
      alert('주소 검색 모듈을 불러오는 중입니다. 잠시 후 다시 시도하세요.')
      return
    }
    new window.daum.Postcode({
      oncomplete: (data: any) => {
        onUpdate(tmpId, {
          postal_code: data.zonecode,
          address_main: data.roadAddress || data.jibunAddress,
        })
      },
    }).open()
  }

  function copyFromReserver(tmpId: string) {
    onUpdate(tmpId, {
      recipient_name: customerName || '',
      phone: customerPhone || '',
    })
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-3">택배 안내</h2>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-900 space-y-1">
        <div>• 택배는 <strong>1곳까지 무료</strong>입니다</div>
        <div>• 액자와 인화는 준비 일정이 달라 <strong>2회에 걸쳐 발송</strong>될 수 있습니다</div>
      </div>

      {/* 방문수령 */}
      <label className="flex items-center gap-2 mb-6 cursor-pointer">
        <input
          type="checkbox"
          checked={isPickup}
          onChange={e => onTogglePickup(e.target.checked)}
          className="w-4 h-4 cursor-pointer"
        />
        <span className="text-sm font-medium">스튜디오 방문 수령 (택배 없음)</span>
      </label>

      {!isPickup && (
        <>
          <div className="space-y-4">
            {deliveries.map((d, idx) => (
              <div key={d._tmp_id} className="bg-white border border-gray-200 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-gray-700">수령지 {idx + 1}</span>
                  {deliveries.length > 1 && (
                    <button
                      onClick={() => onDelete(d._tmp_id)}
                      className="text-xs text-gray-400 hover:text-red-500 cursor-pointer"
                    >
                      삭제
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={d.recipient_name}
                      onChange={e => onUpdate(d._tmp_id, { recipient_name: e.target.value })}
                      placeholder="받는 분"
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                    />
                    <button
                      onClick={() => copyFromReserver(d._tmp_id)}
                      className="px-3 py-2 text-xs text-gray-500 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer whitespace-nowrap"
                    >
                      예약자와 동일
                    </button>
                  </div>

                  <input
                    type="tel"
                    value={d.phone}
                    onChange={e => onUpdate(d._tmp_id, { phone: e.target.value })}
                    placeholder="연락처"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                  />

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={d.postal_code}
                      readOnly
                      placeholder="우편번호"
                      className="w-24 px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                    />
                    <button
                      onClick={() => openAddressSearch(d._tmp_id)}
                      className="px-4 py-2 text-sm bg-gray-900 text-white rounded-lg hover:bg-gray-800 cursor-pointer"
                    >
                      주소 찾기
                    </button>
                  </div>

                  <input
                    type="text"
                    value={d.address_main}
                    readOnly
                    placeholder="기본 주소"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50"
                  />

                  <input
                    type="text"
                    value={d.address_detail}
                    onChange={e => onUpdate(d._tmp_id, { address_detail: e.target.value })}
                    placeholder="상세 주소"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                  />

                  <input
                    type="text"
                    value={d.memo}
                    onChange={e => onUpdate(d._tmp_id, { memo: e.target.value })}
                    placeholder="택배 메모 (선택)"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
                  />
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={onAdd}
            className="mt-4 w-full py-3 border-2 border-dashed border-gray-200 rounded-2xl text-sm text-gray-500 hover:border-gray-400 hover:text-gray-700 cursor-pointer"
          >
            + 수령지 추가
          </button>
        </>
      )}
    </div>
  )
}
