'use client'

import { useState, useEffect } from 'react'

type Props = {
  processSteps: string | null
}

export default function Step2Process({ processSteps }: Props) {
  const steps = (processSteps || '합성/보정,전송,피드백,추가수정,전송')
    .split(',')
    .map(s => s.trim())
    .filter(s => s)

  const [visibleCount, setVisibleCount] = useState(1)

  useEffect(() => {
    // 스텝 변경 시 초기화
    setVisibleCount(1)
  }, [processSteps])

  function showNext() {
    if (visibleCount < steps.length) {
      setVisibleCount(v => v + 1)
    }
  }

  const allVisible = visibleCount >= steps.length

  return (
    <div
      className="flex flex-col items-center justify-center min-h-[60vh] cursor-pointer select-none"
      onClick={showNext}
    >
      <div className="mb-12 text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-3">앞으로의 진행 과정</h2>
        <p className="text-sm text-gray-400">
          {allVisible ? '모든 단계가 표시되었습니다' : '화면을 클릭하면 다음 단계가 나타납니다'}
        </p>
      </div>

      <div className="flex items-center justify-center gap-4 flex-wrap max-w-5xl px-8">
        {steps.map((step, idx) => {
          const visible = idx < visibleCount
          return (
            <div
              key={idx}
              className="flex items-center transition-all duration-500"
              style={{
                opacity: visible ? 1 : 0,
                transform: visible ? 'translateX(0)' : 'translateX(-30px)',
                pointerEvents: visible ? 'auto' : 'none',
              }}
            >
              {idx > 0 && (
                <div className="text-3xl text-gray-300 mx-3">→</div>
              )}
              <div className="px-8 py-4 bg-white border-2 border-gray-200 rounded-2xl shadow-sm text-xl font-medium text-gray-800">
                {step}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
