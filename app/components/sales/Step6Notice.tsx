'use client'

import { useState, useEffect } from 'react'

type Props = {
  notice: string | null  // 패키지의 notice 필드 (| 구분)
}

const DEFAULT_NOTICES = [
  { icon: '🕐', text: '보정 약 2~3주 정도 소요됩니다' },
  { icon: '🖼️', text: '액자까지 약 +1~2주 더 걸립니다' },
  { icon: '✏️', text: '얼굴 재합성은 1회까지 가능합니다' },
  { icon: '🔍', text: '너무 확대해서 보면 과보정되기 쉬우니 유의해주세요' },
]

export default function Step6Notice({ notice }: Props) {
  const [visibleCount, setVisibleCount] = useState(1)

  // 패키지별 notice 파싱, 없으면 기본값
  let items: { icon: string; text: string }[] = []
  if (notice && notice.trim()) {
    const parts = notice.split('|').map(s => s.trim()).filter(s => s)
    items = parts.map((text, idx) => {
      const defaultIcon = DEFAULT_NOTICES[idx]?.icon || '•'
      return { icon: defaultIcon, text }
    })
  } else {
    items = DEFAULT_NOTICES
  }

  useEffect(() => {
    setVisibleCount(1)
  }, [notice])

  function showNext() {
    if (visibleCount < items.length) setVisibleCount(v => v + 1)
  }

  const allVisible = visibleCount >= items.length

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] cursor-pointer select-none px-8"
      onClick={showNext}
    >
      <div className="mb-10 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">안내사항</h2>
        <p className="text-sm text-gray-400">
          {allVisible ? '' : '화면을 클릭하면 다음 항목이 나타납니다'}
        </p>
      </div>

      <div className="space-y-5 max-w-xl w-full">
        {items.map((item, idx) => {
          const visible = idx < visibleCount
          return (
            <div
              key={idx}
              className="flex items-start gap-4 transition-all duration-500"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-30px)',
                pointerEvents: visible ? 'auto' : 'none',
              }}
            >
              <div className="text-3xl">{item.icon}</div>
              <div className="text-lg text-gray-800 pt-1">{item.text}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
