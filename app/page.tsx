'use client'

import MainLayout from '@/app/components/MainLayout'

export default function HomePage() {
  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h2 className="text-xl font-bold mb-2">U-work</h2>
          <p className="text-gray-500 text-sm">
            상단 메뉴에서 기능을 선택하세요.
          </p>
        </div>
      </div>
    </MainLayout>
  )
}