'use client'

type Props = {
  currentStep: number
  onStepClick: (step: number) => void
}

const STEPS = [
  { id: 1, label: '기초정보' },
  { id: 2, label: '작업절차' },
  { id: 3, label: '제공내역' },
  { id: 4, label: '택배정보' },
  { id: 5, label: '연락처' },
  { id: 6, label: '유의사항' },
  { id: 7, label: '결제' },
]

export default function SaleStepNav({ currentStep, onStepClick }: Props) {
  return (
    <div className="flex items-center justify-center gap-1 py-4 border-b border-gray-100 bg-white">
      {STEPS.map((step, idx) => (
        <div key={step.id} className="flex items-center">
          <button
            onClick={() => onStepClick(step.id)}
            className={`px-3 py-1.5 text-sm rounded-lg transition cursor-pointer ${
              currentStep === step.id
                ? 'text-gray-900 font-bold'
                : 'text-gray-300 hover:text-gray-600'
            }`}
          >
            {step.label}
          </button>
          {idx < STEPS.length - 1 && (
            <span className="text-gray-200 text-xs mx-0.5">—</span>
          )}
        </div>
      ))}
    </div>
  )
}
