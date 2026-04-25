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

// 카테고리별 라벨
const CATEGORY_LABEL: Record<string, string> = {
  item_frame: '액자',
  item_wedding: '웨딩',
  item_old: '이전',
  item_pr: '인화',
  item_file: '원본파일',
  item_album: '앨범',
  item_rwd: '리워드',
  item_etc: '기타',
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

  // 모든 카테고리의 라인 표시 (숨김 제외)
  const visibleLines = lines.filter(l => l.is_visible !== false)

  // 같은 카테고리의 아이템 목록 (사이즈 선택 드롭다운용)
  function getCategoryItems(itemId: string | null): PriceItem[] {
    if (!itemId) return []
    const cur = items.find(i => i.id === itemId)
    if (!cur) return []
    return items
      .filter(i => i.item_category === cur.item_category)
      .sort((a, b) => a.sort_order - b.sort_order)
  }

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

  // 아이템 변경 (사이즈 드롭다운 선택 시)
  function handleItemChange(line: SaleLine, newItemId: string) {
    const newItem = items.find(i => i.id === newItemId)
    if (!newItem) return

    const defaultOpt = options.find(o => o.item_id === newItemId && o.is_default)
    const patch: Partial<SaleLine> = {
      item_id: newItemId,
      item_code: newItem.code,
      item_label: null, // 직접 선택이므로 라벨 리셋
      base_unit_price: newItem.base_price,
      option_id: defaultOpt?.id || line.option_id,
      option_text: defaultOpt?.option_name || line.option_text,
      option_price_diff: defaultOpt?.price_diff ?? line.option_price_diff,
      bill_people: newItem.price_unit_type === 'person' ? (line.bill_people || 0) : null,
    }

    // upgrade 타입이었으면 add로 리셋 (직접 사이즈를 골랐으므로)
    if (line.line_type === 'upgrade') {
      patch.line_type = 'add'
    }

    const updated: SaleLine = { ...line, ...patch }
    const calc = calcLineAmount(updated)
    patch.unit_price = calc.unit_price
    patch.retouch_extra_price = calc.retouch_extra
    patch.line_amount = calc.line_amount

    onUpdateLine(line._tmp_id!, patch)
  }

  function handleTypeChange(line: SaleLine, newType: SaleLineType) {
    const patch: Partial<SaleLine> = { line_type: newType }
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

  function handleQtyChange(line: SaleLine, qty: number) {
    const patch: Partial<SaleLine> = { qty: Math.max(1, qty) }
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

  // 카테고리 구분용: item의 카테고리 가져오기
  function getItemCategory(line: SaleLine): string {
    if (!line.item_id) return 'unknown'
    const item = items.find(i => i.id === line.item_id)
    return item?.item_category || 'unknown'
  }

  // 사이즈 드롭다운이 필요한 카테고리들
  const DROPDOWN_CATEGORIES = ['item_frame', 'item_pr', 'item_album', 'item_file', 'item_wedding', 'item_old', 'item_etc']

  // 수량 표시가 필요한 카테고리들
  const QTY_CATEGORIES = ['item_pr', 'item_album', 'item_file', 'item_etc', 'item_rwd']

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
          const category = item?.item_category || 'unknown'
          const categoryItems = getCategoryItems(line.item_id)
          const itemOpts = getItemOptions(line.item_id)
          const upgradeList = getUpgradeOptions(line.item_id)
          const isUpgradeOpen = upgradeOpenFor === line._tmp_id
          const showDropdown = DROPDOWN_CATEGORIES.includes(category) && categoryItems.length > 1
          const showQty = QTY_CATEGORIES.includes(category)

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
                    {/* 카테고리 라벨 */}
                    <span className="text-xs text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
                      {CATEGORY_LABEL[category] || category}
                    </span>

                    {/* 아이템 선택: 드롭다운 or 텍스트 */}
                    {showDropdown ? (
                      <select
                        value={line.item_id || ''}
                        onChange={e => handleItemChange(line, e.target.value)}
                        className="text-base font-medium text-gray-900 border border-gray-200 rounded-lg px-2 py-1 cursor-pointer"
                      >
                        {categoryItems.map(ci => (
                          <option key={ci.id} value={ci.id}>{ci.name}</option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-lg font-medium text-gray-900">
                        {line.item_label || item?.name || '상품 없음'}
                      </span>
                    )}

                    {/* 업그레이드 버튼 (액자만, 드롭다운이 있어도 기존 방식 유지) */}
                    {category === 'item_frame' && upgradeList.length > 0 && (
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

                    {/* 옵션 (색상 등) 드롭다운 */}
                    {itemOpts.length > 0 && (
                      <select
                        value={line.option_id || ''}
                        onChange={e => handleOptionChange(line, e.target.value)}
                        className="text-sm border border-gray-200 rounded px-2 py-1 cursor-pointer"
                      >
                        {itemOpts.map(opt => (
                          <option key={opt.id} value={opt.id}>
                            {opt.option_name}
                          </option>
                        ))}
                      </select>
                    )}

                    {/* 수량 (인화, 앨범, 파일, 기타) */}
                    {showQty && (
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-gray-400">수량</span>
                        <input
                          type="number"
                          min={1}
                          value={line.qty}
                          onChange={e => handleQtyChange(line, Number(e.target.value))}
                          className="w-14 text-sm border border-gray-200 rounded px-2 py-1 text-center"
                        />
                      </div>
                    )}

                    {/* 인원 (person 타입만) */}
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