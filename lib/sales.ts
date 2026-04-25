// 판매 관련 타입 및 유틸
export type SaleLineType = 'default' | 'add' | 'upgrade' | 'service' | 'reward' | 'manual'

export type PriceItem = {
  id: string
  item_category: string
  item_category_name: string
  code: string
  name: string
  price_unit_type: 'person' | 'qty' | 'fixed'
  base_unit: number
  unit_label: string
  base_price: number
  extra_unit_price: number
  sort_order: number
}

export type PriceItemOption = {
  id: string
  item_id: string
  option_name: string
  price_diff: number
  is_default: boolean
  sort_order: number
}

export type PricePackage = {
  id: string
  price_table_id: string
  category: string
  category_name: string
  code: string
  name: string
  base_people: number
  base_price: number
  extra_people_unit_price: number
  deposit_amount: number
  process_steps: string | null
  notice: string | null
  sort_order: number
}

export type PricePackageItem = {
  id: string
  package_id: string
  item_id: string
  qty: number
  retouch_base_people: number | null
  retouch_extra_per_person: number
  sort_order: number
  memo: string | null
  // JOIN
  price_items?: PriceItem
}

export type SaleLine = {
  id?: string
  line_no: number
  item_id: string | null
  item_code: string | null
  item_label: string | null
  qty: number
  bill_people: number | null
  option_id: string | null
  option_text: string | null
  base_unit_price: number
  option_price_diff: number
  retouch_extra_price: number
  unit_price: number
  line_discount: number
  line_amount: number
  line_type: SaleLineType
  is_visible: boolean
  upgrades_line_id: string | null
  description: string | null
  memo: string | null
  // 보정규칙 참고용 (서버 저장 안함)
  _retouch_base_people?: number | null
  _retouch_extra_per_person?: number
  // UI용
  _tmp_id?: string  // 로컬 식별
}

/**
 * 라인 가격 계산
 * - 기본제공(default): 0원
 * - 추가(add)/업그레이드(upgrade): 정가 + 보정추가금 + 옵션차액
 * - 서비스/리워드: 0원
 * - 수동(manual): unit_price 그대로
 */
export function calcLineAmount(line: SaleLine): {
  unit_price: number
  retouch_extra: number
  line_amount: number
} {
  const type = line.line_type

  if (type === 'default' || type === 'service' || type === 'reward') {
    return { unit_price: 0, retouch_extra: 0, line_amount: 0 }
  }

  if (type === 'manual') {
    return {
      unit_price: line.unit_price,
      retouch_extra: line.retouch_extra_price,
      line_amount: (line.unit_price * line.qty) - line.line_discount,
    }
  }

  // add / upgrade
  const basePrice = line.base_unit_price + line.option_price_diff
  const billPeople = line.bill_people || 0
  const retouchBase = line._retouch_base_people
  const retouchExtraPerPerson = line._retouch_extra_per_person || 0

  let retouchExtra = 0
  if (retouchBase !== null && retouchBase !== undefined && billPeople > retouchBase) {
    retouchExtra = (billPeople - retouchBase) * retouchExtraPerPerson
  }

  const unitPrice = basePrice + retouchExtra
  const lineAmount = (unitPrice * line.qty) - line.line_discount

  return {
    unit_price: unitPrice,
    retouch_extra: retouchExtra,
    line_amount: lineAmount,
  }
}

/**
 * 업그레이드 라인의 차액 계산
 * 업그레이드의 경우: (새 액자 정가 + 보정추가금) - (원본 액자 정가 + 보정추가금)
 * 단, 기본제공 라인을 업그레이드하는 것이므로 원본은 0원이 아닌 "원래 정가"로 계산
 */
export function calcUpgradeAmount(
  newItem: PriceItem,
  originalItem: PriceItem,
  billPeople: number,
  retouchBase: number | null,
  retouchExtraPerPerson: number,
  optionPriceDiff: number = 0
): number {
  // 새 액자 정가
  const newBase = newItem.base_price + optionPriceDiff
  let newRetouchExtra = 0
  if (retouchBase !== null && billPeople > retouchBase) {
    newRetouchExtra = (billPeople - retouchBase) * retouchExtraPerPerson
  }
  const newPrice = newBase + newRetouchExtra

  // 원본 액자 정가
  const origBase = originalItem.base_price
  let origRetouchExtra = 0
  if (retouchBase !== null && billPeople > retouchBase) {
    origRetouchExtra = (billPeople - retouchBase) * retouchExtraPerPerson
  }
  const origPrice = origBase + origRetouchExtra

  return newPrice - origPrice
}

export function formatPrice(n: number): string {
  return new Intl.NumberFormat('ko-KR').format(n)
}

export function genTmpId(): string {
  return `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}
