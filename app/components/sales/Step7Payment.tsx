'use client'

import type { SaleLine, PriceItem, PricePackage } from '@/lib/sales'
import { formatPrice } from '@/lib/sales'

export type Payment = {
  _tmp_id: string
  amount: number
  method: string
  method_detail: string
}

type Props = {
  customerName: string
  shootDate: string
  packageInfo: PricePackage | null
  peopleCount: number
  basePrice: number
  lines: SaleLine[]
  items: PriceItem[]

  discount: number
  onDiscountChange: (v: number) => void

  depositAmount: number    // 차감 가능한 예약금

  payments: Payment[]
  onPaymentAdd: () => void
  onPaymentUpdate: (tmpId: string, patch: Partial<Payment>) => void
  onPaymentDelete: (tmpId: string) => void
}

const METHOD_LABEL: Record<string, string> = {
  card: '카드',
  cash: '현금',
  transfer: '이체',
}

export default function Step7Payment({
  customerName,
  shootDate,
  packageInfo,
  peopleCount,
  basePrice,
  lines,
  items,
  discount,
  onDiscountChange,
  depositAmount,
  payments,
  onPaymentAdd,
  onPaymentUpdate,
  onPaymentDelete,
}: Props) {
  const lineSum = lines
    .filter(l => l.is_visible !== false)
    .reduce((sum, l) => sum + l.line_amount, 0)

  const totalAmount = basePrice + lineSum - discount - depositAmount

  const paidSum = payments.reduce((s, p) => s + (p.amount || 0), 0)
  const remain = totalAmount - paidSum
  const isPaid = remain <= 0 && totalAmount > 0

  const formatDate = (ymd: string) => {
    if (!ymd) return '-'
    const d = new Date(ymd)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }

  // 표시용 라인들 (숨김 제외)
  const visibleLines = lines.filter(l => l.is_visible !== false)

  return (
    <div className="max-w-3xl mx-auto p-8">
      {/* 헤더 박스 */}
      <div className="bg-white border-2 border-gray-900 rounded-2xl p-6 mb-6">
        <div className="text-2xl font-bold mb-1">{customerName} 님</div>
        <div className="flex justify-between items-end">
          <div className="text-gray-600">
            {formatDate(shootDate)}
            {' · '}
            {packageInfo?.name || '-'}
            {' · '}
            {peopleCount}인
          </div>
          <div className="text-2xl font-bold text-gray-900">
            {formatPrice(basePrice)}원
          </div>
        </div>
      </div>

      {/* 라인 리스트 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
        {visibleLines.length === 0 ? (
          <p className="text-center text-gray-400 py-4 text-sm">추가 항목이 없습니다</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {visibleLines.map((line, idx) => {
                const item = items.find(i => i.id === line.item_id)
                const displayName = line.item_label || item?.name || '-'
                const opts = []
                if (line.option_text) opts.push(line.option_text)
                if (line.qty > 1) opts.push(`×${line.qty}`)
                if (line.description) opts.push(line.description)

                const isDefault = line.line_type === 'default'
                const isReward = line.line_type === 'reward' || line.line_type === 'service'

                return (
                  <tr key={line._tmp_id} className="border-b border-gray-50 last:border-b-0">
                    <td className="py-2 text-gray-400 w-8">{idx + 1}</td>
                    <td className="py-2">
                      <span className="text-gray-900">{displayName}</span>
                      {opts.length > 0 && (
                        <span className="text-gray-500 ml-2">{opts.join(' / ')}</span>
                      )}
                    </td>
                    <td className="py-2 text-right whitespace-nowrap">
                      {isDefault ? (
                        <span className="text-gray-400 text-xs">기본제공</span>
                      ) : isReward ? (
                        <span className="text-green-500 text-xs">{line.line_type === 'reward' ? '리워드' : '서비스'}</span>
                      ) : (
                        <span className="font-medium">+{formatPrice(line.line_amount)}</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* 합계 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 mb-6 space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">기본촬영비</span>
          <span>{formatPrice(basePrice)}원</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">추가 합계</span>
          <span>{formatPrice(lineSum)}원</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-600">할인</span>
          <input
            type="number"
            value={discount}
            onChange={e => onDiscountChange(Number(e.target.value) || 0)}
            className="w-32 text-right px-2 py-1 border border-gray-200 rounded text-sm"
          />
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">예약금 차감</span>
          <span className={depositAmount > 0 ? 'text-blue-600' : ''}>
            {depositAmount > 0 ? `-${formatPrice(depositAmount)}` : '0'}원
          </span>
        </div>
        <div className="border-t border-gray-200 pt-3 flex justify-between items-end">
          <span className="text-gray-700 font-medium">최종 결제액</span>
          <span className="text-3xl font-bold text-gray-900">
            {formatPrice(totalAmount)}원
          </span>
        </div>
      </div>

      {/* 결제 */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5">
        <h3 className="text-sm font-bold mb-3">결제</h3>

        <div className="space-y-2 mb-3">
          {payments.map(p => (
            <div key={p._tmp_id} className="flex gap-2 items-center">
              <select
                value={p.method}
                onChange={e => onPaymentUpdate(p._tmp_id, { method: e.target.value })}
                className="px-2 py-2 border border-gray-200 rounded-lg text-sm"
              >
                <option value="card">카드</option>
                <option value="cash">현금</option>
                <option value="transfer">이체</option>
              </select>
              <input
                type="number"
                value={p.amount || ''}
                onChange={e => onPaymentUpdate(p._tmp_id, { amount: Number(e.target.value) || 0 })}
                placeholder="금액"
                className="w-32 px-2 py-2 border border-gray-200 rounded-lg text-sm text-right"
              />
              <span className="text-xs text-gray-400">원</span>
              <input
                type="text"
                value={p.method_detail}
                onChange={e => onPaymentUpdate(p._tmp_id, { method_detail: e.target.value })}
                placeholder="상세 (카드번호 끝자리 등)"
                className="flex-1 px-2 py-2 border border-gray-200 rounded-lg text-sm"
              />
              <button
                onClick={() => onPaymentDelete(p._tmp_id)}
                className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 cursor-pointer"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <button
          onClick={onPaymentAdd}
          className="w-full py-2 text-sm border border-dashed border-gray-200 rounded-lg text-gray-500 hover:border-gray-400 cursor-pointer"
        >
          + 결제 추가
        </button>

        {payments.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
            <span>합계 <strong>{formatPrice(paidSum)}원</strong> / 잔액 <strong className={remain > 0 ? 'text-red-500' : ''}>{formatPrice(Math.max(0, remain))}원</strong></span>
            {isPaid && <span className="text-green-600 font-medium">✓ 완결</span>}
          </div>
        )}
      </div>
    </div>
  )
}
