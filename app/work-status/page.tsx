'use client'

import MainLayout from '@/app/components/MainLayout'

export default function WorkStatusPage() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
          <h2 className="text-xl font-bold mb-2">작업현황</h2>
          <p className="text-gray-400 text-sm">
            판매 기능 구현 후 활성화됩니다.
          </p>
          <div className="mt-6 inline-block px-4 py-2 bg-gray-100 rounded-lg text-xs text-gray-500">
            촬영 후처리 공정 관리 (jpg내보내기 → 원본전송 → 보정 → 실물상품 → 택배)
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
