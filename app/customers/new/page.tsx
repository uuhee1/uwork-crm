'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import { useRouter } from 'next/navigation'

export default function NewCustomerPage() {
  const router = useRouter()
  const [staffId, setStaffId] = useState('')
  const [saving, setSaving] = useState(false)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [groupName, setGroupName] = useState('유유히')
  const [memo, setMemo] = useState('')

  useEffect(() => {
    loadStaff()
  }, [])

  async function loadStaff() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase
      .from('staff')
      .select('id')
      .eq('auth_user_id', user.id)
      .single()
    if (data) setStaffId(data.id)
  }

  function formatPhone(raw: string): string {
    return raw.replace(/[^0-9]/g, '')
  }

  function getLast4(digits: string): string {
    if (digits.length >= 4) return digits.slice(-4)
    return digits
  }

  async function handleSubmit() {
    if (!name.trim()) {
      alert('이름을 입력하세요.')
      return
    }

    setSaving(true)

    const phoneDigits = formatPhone(phone)
    const last4 = phoneDigits ? getLast4(phoneDigits) : null

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: name.trim(),
        phone: phoneDigits || null,
        phone_last4: last4,
        group_name: groupName,
        staff_id: staffId || null,
        memo: memo.trim() || null,
      })
      .select('id')
      .single()

    if (error) {
      alert('저장 실패: ' + error.message)
      setSaving(false)
      return
    }

    // 저장 성공 → 조회 페이지로 이동 (고객 ID 전달)
    router.push(`/search?customer_id=${data.id}`)
  }

  return (
    <MainLayout>
      <div className="max-w-lg mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-6">고객 등록</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="고객 이름"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label>
              <input
                type="tel"
                value={phone}
                onChange={e => setPhone(e.target.value)}
                placeholder="010-1234-5678"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <p className="text-xs text-gray-400 mt-1">하이픈 포함해도 자동 제거됩니다</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">소속</label>
              <select
                value={groupName}
                onChange={e => setGroupName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              >
                <option value="유유히">유유히</option>
                <option value="모디온">모디온</option>
                <option value="웨이블루">웨이블루</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
              <textarea
                value={memo}
                onChange={e => setMemo(e.target.value)}
                placeholder="간단 메모"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>

            <button
              onClick={handleSubmit}
              disabled={saving}
              className="w-full py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 disabled:opacity-50 cursor-pointer"
            >
              {saving ? '저장 중...' : '등록'}
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}