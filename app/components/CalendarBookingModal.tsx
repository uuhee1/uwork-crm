'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type CustomerResult = {
  id: string
  name: string
  phone: string | null
  phone_last4: string | null
  group_name: string
}

type ShootType = {
  id: string
  code: string
  label: string
}

type Props = {
  defaultDate: string  // YYYY-MM-DD
  defaultTime?: string // HH:mm
  onSaved: () => void
  onClose: () => void
}

export default function CalendarBookingModal({ defaultDate, defaultTime, onSaved, onClose }: Props) {
  const [staffId, setStaffId] = useState('')
  const [shootTypes, setShootTypes] = useState<ShootType[]>([])
  const [saving, setSaving] = useState(false)

  // 고객 연결
  const [customerMode, setCustomerMode] = useState<'search' | 'new'>('search')
  const [linkedCustomer, setLinkedCustomer] = useState<CustomerResult | null>(null)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([])
  const [searching, setSearching] = useState(false)

  // 신규 고객
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newGroup, setNewGroup] = useState('유유히')

  // 스케줄 정보
  const [shootTypeId, setShootTypeId] = useState('')
  const [peopleCount, setPeopleCount] = useState(4)
  const [shootDate, setShootDate] = useState(defaultDate)
  const [startAt, setStartAt] = useState(defaultTime || '10:00')
  const [endAt, setEndAt] = useState(defaultTime ? addMinutes(defaultTime, 90) : '11:30')
  const [status, setStatus] = useState('wait')
  const [depositStatus, setDepositStatus] = useState('pending')
  const [memo, setMemo] = useState('')

  useEffect(() => {
    loadInit()
  }, [])

  async function loadInit() {
    const { data: types } = await supabase
      .from('shoot_types')
      .select('id, code, label')
      .eq('is_active', true)
      .order('sort_order')
    if (types && types.length > 0) {
      setShootTypes(types)
      setShootTypeId(types[0].id)
    }

    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (staff) setStaffId(staff.id)
    }
  }

  async function handleSearch() {
    if (!searchKeyword.trim()) return
    setSearching(true)
    const k = searchKeyword.trim()
    const isPhone = /^\d{2,}$/.test(k)
    let query = supabase.from('customers').select('id, name, phone, phone_last4, group_name')
    if (isPhone) query = query.eq('phone_last4', k.slice(-4))
    else query = query.ilike('name', `%${k}%`)
    const { data } = await query.order('created_at', { ascending: false }).limit(10)
    setSearchResults(data || [])
    setSearching(false)
  }

  function selectCustomer(c: CustomerResult) {
    setLinkedCustomer(c)
    setSearchResults([])
    setSearchKeyword('')
  }

  async function handleSubmit() {
    let customerId = linkedCustomer?.id

    if (!customerId && customerMode === 'new') {
      if (!newName.trim()) { alert('고객 이름을 입력하세요.'); return }
      const phoneDigits = newPhone.replace(/[^0-9]/g, '')
      const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : phoneDigits || null
      const { data: newCust, error: custErr } = await supabase
        .from('customers')
        .insert({
          name: newName.trim(),
          phone: phoneDigits || null,
          phone_last4: last4,
          group_name: newGroup,
          staff_id: staffId || null,
        })
        .select('id, name, phone, phone_last4, group_name')
        .single()
      if (custErr || !newCust) { alert('고객 등록 실패: ' + (custErr?.message || '')); return }
      customerId = newCust.id
    }

    if (!customerId) { alert('고객을 선택하거나 등록해주세요.'); return }
    if (!shootTypeId) { alert('촬영종류를 선택하세요.'); return }

    setSaving(true)

    const { error } = await supabase
      .from('schedules')
      .insert({
        customer_id: customerId,
        shoot_type_id: shootTypeId,
        people_count: peopleCount,
        shoot_date: shootDate,
        start_at: startAt,
        end_at: endAt,
        status,
        deposit_status: depositStatus,
        memo: memo.trim() || null,
        staff_id: staffId,
      })

    if (error) {
      alert('예약 등록 실패: ' + error.message)
      setSaving(false)
      return
    }

    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="h-2 bg-green-500 rounded-t-2xl" />
        <div className="p-6">
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-lg font-bold">예약 등록</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
          </div>

          {/* 고객 연결 */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-medium">고객</span>
              {linkedCustomer && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                  ✓ {linkedCustomer.name} ({linkedCustomer.phone || '번호없음'})
                </span>
              )}
            </div>

            {!linkedCustomer ? (
              <>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setCustomerMode('search')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      customerMode === 'search' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    기존 고객 검색
                  </button>
                  <button
                    onClick={() => setCustomerMode('new')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                      customerMode === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    신규 고객
                  </button>
                </div>

                {customerMode === 'search' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                        placeholder="이름 또는 전화 뒤4자리"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                      <button onClick={handleSearch} disabled={searching} className="px-3 py-2 bg-gray-900 text-white rounded-lg text-xs cursor-pointer">검색</button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border border-gray-200 rounded-lg max-h-32 overflow-y-auto">
                        {searchResults.map(c => (
                          <button key={c.id} onClick={() => selectCustomer(c)} className="w-full text-left px-3 py-2 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer text-sm">
                            <span className="font-medium">{c.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{c.phone || '번호없음'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {customerMode === 'new' && (
                  <div className="grid grid-cols-3 gap-2">
                    <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="이름 *" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="전화번호" className="px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                    <select value={newGroup} onChange={e => setNewGroup(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                      <option value="유유히">유유히</option>
                      <option value="모디온">모디온</option>
                      <option value="웨이블루">웨이블루</option>
                    </select>
                  </div>
                )}
              </>
            ) : (
              <button onClick={() => setLinkedCustomer(null)} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer underline">다른 고객으로 변경</button>
            )}
          </div>

          {/* 스케줄 정보 */}
          <div className="border-t border-gray-200 pt-5">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">촬영종류 *</label>
                <select value={shootTypeId} onChange={e => setShootTypeId(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  {shootTypes.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">인원</label>
                <input type="number" min={1} value={peopleCount} onChange={e => setPeopleCount(Number(e.target.value))} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">촬영일 *</label>
                <input type="date" value={shootDate} onChange={e => setShootDate(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
              </div>
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">시작</label>
                  <input type="time" value={startAt} onChange={e => setStartAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
                <div className="flex-1">
                  <label className="block text-xs text-gray-500 mb-1">종료</label>
                  <input type="time" value={endAt} onChange={e => setEndAt(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">예약상태</label>
                <select value={status} onChange={e => setStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="wait">확정대기</option>
                  <option value="confirmed">확정</option>
                  <option value="canceled">취소</option>
                  <option value="noshow">노쇼</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">예약금</label>
                <select value={depositStatus} onChange={e => setDepositStatus(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="pending">입금대기</option>
                  <option value="paid">입금완료</option>
                  <option value="nodeposit">면제</option>
                  <option value="refunded">환불완료</option>
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label className="block text-xs text-gray-500 mb-1">메모</label>
              <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} placeholder="촬영 메모" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
            </div>
          </div>

          {/* 버튼 */}
          <div className="flex gap-2 mt-6">
            <button onClick={handleSubmit} disabled={saving} className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50">
              {saving ? '저장 중...' : '예약 등록'}
            </button>
            <button onClick={onClose} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer">취소</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(':').map(Number)
  const total = h * 60 + m + minutes
  const nh = Math.floor(total / 60) % 24
  const nm = total % 60
  return `${String(nh).padStart(2, '0')}:${String(nm).padStart(2, '0')}`
}
