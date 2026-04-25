'use client'

import type { PricePackage } from '@/lib/sales'

type Props = {
  customerName: string
  shootDate: string
  packageInfo: PricePackage | null
  peopleCount: number
  staffName: string
}

export default function Step1Basic({
  customerName,
  shootDate,
  packageInfo,
  peopleCount,
  staffName,
}: Props) {
  const formatDate = (ymd: string) => {
    if (!ymd) return '-'
    const d = new Date(ymd)
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const wkd = ['일','월','화','수','목','금','토'][d.getDay()]
    return `${yyyy}-${mm}-${dd} (${wkd})`
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] relative">
      <div className="text-center space-y-8">
        <div className="text-5xl font-bold text-gray-900 tracking-tight">
          {customerName || '고객 미선택'}
        </div>
        <div className="text-2xl text-gray-600">
          {shootDate ? formatDate(shootDate) : '촬영일 미지정'}
        </div>
        <div className="text-2xl text-gray-800">
          {packageInfo?.name ? (
            <>
              {packageInfo.category_name} / {packageInfo.name}
              {' · '}
              <span className="font-medium">{peopleCount}인</span>
            </>
          ) : (
            <span className="text-gray-400">상품 미선택</span>
          )}
        </div>
      </div>
      <div className="absolute bottom-8 right-8 text-xs text-gray-300">
        담당 {staffName || '-'}
      </div>
    </div>
  )
}
