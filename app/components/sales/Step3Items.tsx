'use client'

import { useState } from 'react'
import type { SaleLine, PriceItem, PriceItemOption, SaleLineType } from '@/lib/sales'
import { calcLineAmount, formatPrice } from '@/lib/sales'

type Props = {
  lines: SaleLine[]
  items: PriceItem[]
  options: PriceItemOption[]
  showPrice: boolean
  onTogglePrice: () => void
  onUpdateLine: (tmpId: string, patch: Partial<SaleLine>) => void
  onDeleteLine: (tmpId: string) => void
  onAddLine: (category: string) => void
  onUpgradeLine: (tmpId: string, newItemId: string) => void
}

const LINE_TYPE_LABEL: Record<SaleLineType, string> = {
  default: '기본제공',
  add: 'add',
  upgrade: 'upgrade',
  service: '서비스',
  reward: '리워드',
  manual: '수동',
}

export default function Step3Items({
  lines,
  items,
  options,
  showPrice,
  onTogglePrice,
  onUpdateLine,
  onDeleteLine,
  onAddLine,
  onUpgradeLine,
}: Props) {
  const [upgradeOpenFor, setUpgradeOpenFor] = useState<string | null>(null)
  const [typeOpenFor, setTypeOpenFor] = useState<string | null>(null)

  // 액자 라인만 표시 (item_category = 'item_frame' 또는 업그레이드)
  const visibleLines = lines.filter(l => {
    if (!l.is_visible) return false
    const item = items.find(i => i.id === l.item_id)
    if (!item) return l.line_type === 'manual'
    return item.item_category === 'item_frame' || item.item_category === 'item_wedding' || item.item_category === 'item_old'
  })

  // 업그레이드 가능한 액자 목록 (현재 아이템보다 큰 사이즈)
  function getUpgradeOptions(currentItemId: string | null): PriceItem[] {
    if (!currentItemId) return []
    const cur = items.find(i => i.id === currentItemId)
    if (!cur || cur.item_category !== 'item_frame') return []
    return items
      .filter(i => i.item_category === 'item_frame' && i.sort_order > cur.sort_order)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

  function getItemOptions(itemId: string | null): PriceItemOption[] {
    if (!itemId) return []
    return options.filter(o => o.item_id === itemId).sort((a, b) => a.sort_order - b.sort_order)
  }

  function handleTypeChange(line: SaleLine, newType: SaleLineType) {
    const patch: Partial<SaleLine> = { line_type: newType }
    // 가격 재계산
    const updated: SaleLine = { ...line, ...patch }
    const calc = calcLineAmount(updated)
    patch.unit_price = calc.unit_price
    patch.retouch_extra_price = calc.retouch_extra
    patch.line_amount = calc.line_amount
    onUpdateLine(line._tmp_id!, patch)
    setTypeOpenFor(null)
  }

  function handleOptionChange(line: SaleLine, optionId: string) {
    const opt = options.find(o => o.id === optionId)
    const patch: Partial<SaleLine> = {
      option_id: optionId,
      option_text: opt?.option_name || null,
      option_price_diff: opt?.price_diff || 0,
    }
    const updated: SaleLine = { ...line, ...patch }
    const calc = calcLineAmount(updated)
    patch.unit_price = calc.unit_price
    patch.retouch_extra_price = calc.retouch_extra
    patch.line_amount = calc.line_amount
    onUpdateLine(line._tmp_id!, patch)
  }

  function handlePeopleChange(line: SaleLine, people: number) {
    const patch: Partial<SaleLine> = { bill_people: people }
    const updated: SaleLine = { ...line, ...patch }
    const calc = calcLineAmount(updated)
    patch.unit_price = calc.unit_price
    patch.retouch_extra_price = calc.retouch_extra
    patch.line_amount = calc.line_amount
    onUpdateLine(line._tmp_id!, patch)
  }

  function renderLineTypeBadge(line: SaleLine) {
    const type = line.line_type
    const isOpen = typeOpenFor === line._tmp_id

    let badgeClass = 'text-xs cursor-pointer transition select-none '
    if (type === 'default') badgeClass += 'text-gray-400 hover:text-gray-600'
    else if (type === 'add') badgeClass += 'text-blue-500 hover:text-blue-700'
    else if (type === 'upgrade') badgeClass += 'text-purple-500 hover:text-purple-700'
    else if (type === 'service' || type === 'reward') badgeClass += 'text-green-500 hover:text-green-700'
    else badgeClass += 'text-gray-400'

    return (
      <div className="relative">
        <span
          className={badgeClass}
          onClick={() => setTypeOpenFor(isOpen ? null : line._tmp_id!)}
        >
          {LINE_TYPE_LABEL[type]}
        </span>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setTypeOpenFor(null)} />
            <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[100px]">
              {(['default', 'add', 'upgrade', 'service', 'reward'] as SaleLineType[]).map(t => (
                <button
                  key={t}
                  onClick={() => handleTypeChange(line, t)}
                  className={`block w-full text-left px-3 py-2 text-xs hover:bg-gray-50 cursor-pointer ${
                    type === t ? 'bg-gray-100 font-medium' : ''
                  }`}
                >
                  {LINE_TYPE_LABEL[t]}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-8">
      <div className="flex justify-end mb-4">
        <button
          onClick={onTogglePrice}
          className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 cursor-pointer"
        >
          {showPrice ? '💰 가격 숨기기' : '💰 가격 보기'}
        </button>
      </div>

      <div className="space-y-3">
        {visibleLines.map((line, idx) => {
          const item = items.find(i => i.id === line.item_id)
          const itemOptions = getItemOptions(line.item_id)
          const upgradeList = getUpgradeOptions(line.item_id)
          const isUpgradeOpen = upgradeOpenFor === line._tmp_id

          return (
            <div
              key={line._tmp_id}
              className="bg-white border border-gray-200 rounded-2xl p-4 hover:border-gray-300 transition"
            >
              <div className="flex items-start gap-3">
                <div className="text-gray-300 font-bold text-lg w-6 text-center pt-1">
                  {idx + 1}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <span className="text-lg font-medium text-gray-900">
                      {line.item_label || item?.name || '상품 없음'}
                    </span>

                    {/* 업그레이드 버튼 */}
                    {item?.item_category === 'item_frame' && upgradeList.length > 0 && (
                      <div className="relative">
                        <button
                          onClick={() => setUpgradeOpenFor(isUpgradeOpen ? null : line._tmp_id!)}
                          className="text-gray-400 hover:text-gray-700 text-lg cursor-pointer"
                          title="더 큰 사이즈로 업그레이드"
                        >
                          ↑
                        </button>
                        {isUpgradeOpen && (
                          <>
                            <div className="fixed inset-0 z-10" onClick={() => setUpgradeOpenFor(null)} />
                            <div className="absolute left-0 top-8 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[140px] max-h-60 overflow-y-auto">
                              <div className="px-3 py-1.5 text-xs text-gray-400 border-b border-gray-100">
                                업그레이드 →
                              </div>
                              {upgradeList.map(up => (
                                <button
                                  key={up.id}
                                  onClick={() => {
                                    onUpgradeLine(line._tmp_id!, up.id)
                                    setUpgradeOpenFor(null)
                                  }}
                                  className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer"
                                >
                                  {up.name}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* 옵션 (색상) 드롭다운 */}
                    {itemOptions.length > 0 && (
                      <select
                        value={line.option_id || ''}
                        onChange={e => handleOptionChange(line, e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1 cursor-pointer"
                      >
                        {itemOptions.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.option_name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* 인원 */}
                    {item?.price_unit_type === 'person' && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">인원</span>
                        <input
                          type="number"
                          min={0}
                          value={line.bill_people || 0}
                          onChange={e => handlePeopleChange(line, Number(e.target.value))}
                          className="w-14 text-sm border border-gray-200 rounded px-2 py-1 text-center"
                        />
                      </div>
                    )}

                    <div className="ml-auto flex items-center gap-3">
                      {showPrice && (
                        <span className={`text-sm font-medium ${line.line_amount > 0 ? 'text-gray-900' : 'text-gray-400'}`}>
                          {line.line_type === 'default' ? '기본' :
                           line.line_amount > 0 ? `+${formatPrice(line.line_amount)}` :
                           '0'}
                        </span>
                      )}
                      {renderLineTypeBadge(line)}
                    </div>
                  </div>

                  <textarea
                    value={line.description || ''}
                    onChange={e => onUpdateLine(line._tmp_id!, { description: e.target.value })}
                    placeholder="어떤 사진인지, 보정 주의점 등..."
                    rows={2}
                    className="w-full text-sm px-3 py-2 border border-gray-100 rounded-lg bg-gray-50 focus:outline-none focus:border-gray-300 focus:bg-white resize-none"
                  />
                </div>

                <button
                  onClick={() => onDeleteLine(line._tmp_id!)}
                  className="text-gray-300 hover:text-red-500 text-sm cursor-pointer"
                  title="삭제"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* 라인 추가 버튼들 */}
      <div className="mt-6 flex flex-wrap gap-2">
        <button onClick={() => onAddLine('item_frame')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          + 액자
        </button>
        <button onClick={() => onAddLine('item_pr')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          + 인화
        </button>
        <button onClick={() => onAddLine('item_file')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          + 원본파일
        </button>
        <button onClick={() => onAddLine('item_album')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          + 앨범
        </button>
        <button onClick={() => onAddLine('item_rwd')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          + 리워드
        </button>
        <button onClick={() => onAddLine('item_etc')} className="px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 cursor-pointer">
          + 기타
        </button>
      </div>
    </div>
  )
}
