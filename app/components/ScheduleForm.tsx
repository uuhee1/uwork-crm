'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'

type ShootType = {
  id: string
  code: string
  label: string
}

type Props = {
  customerId: string
  onSaved: (scheduleId?: string) => void
  onCancel: () => void
}

// 30분 단위 시간 옵션 생성
function generateTimeOptions(): string[] {
  const times: string[] = []
  for (let h = 0; h < 24; h++) {
    times.push(`${String(h).padStart(2, '0')}:00`)
    times.push(`${String(h).padStart(2, '0')}:30`)
  }
  return times
}

const TIME_OPTIONS = generateTimeOptions()

export default function ScheduleForm({ customerId, onSaved, onCancel }: Props) {
  const [shootTypes, setShootTypes] = useState<ShootType[]>([])
  const [staffId, setStaffId] = useState('')
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  const [shootTypeId, setShootTypeId] = useState('')
  const [peopleCount, setPeopleCount] = useState(4)
  const [shootDate, setShootDate] = useState('')
  const [startAt, setStartAt] = useState('10:00')
  const [endAt, setEndAt] = useState('11:30')
  const [status, setStatus] = useState('wait')
  const [depositStatus, setDepositStatus] = useState('pending')
  const [memo, setMemo] = useState('')

  // 할일 연계
  const [todoEnabled, setTodoEnabled] = useState(false)
  const [todoNote, setTodoNote] = useState('')
  const [todoAssignedId, setTodoAssignedId] = useState('')

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
      if (staff) {
        setStaffId(staff.id)
        setTodoAssignedId(staff.id)
      }
    }

    const { data: allStaff } = await supabase
      .from('staff')
      .select('id, name')
      .eq('is_active', true)
    if (allStaff) setStaffList(allStaff)

    const today = new Date()
    const yyyy = today.getFullYear()
    const mm = String(today.getMonth() + 1).padStart(2, '0')
    const dd = String(today.getDate()).padStart(2, '0')
    setShootDate(`${yyyy}-${mm}-${dd}`)
  }

  async function handleSubmit() {
    if (!shootTypeId) { alert('촬영종류를 선택하세요.'); return }
    if (!shootDate) { alert('촬영일을 입력하세요.'); return }
    if (!startAt || !endAt) { alert('시간을 입력하세요.'); return }

    setSaving(true)

    const { data: schedule, error } = await supabase
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
      .select('id')
      .single()

    if (error) {
      alert('저장 실패: ' + error.message)
      setSaving(false)
      return
    }

    // 할일 등록 (체크했을 때)
    if (todoEnabled && todoNote.trim() && schedule) {
      await supabase.from('consultations').insert({
        customer_id: customerId,
        schedule_id: schedule.id,
        link_type: 'linked',
        content: todoNote.trim(),
        has_todo: true,
        todo_done: false,
        todo_note: todoNote.trim(),
        staff_id: staffId,
        todo_assigned_id: todoAssignedId || staffId,
      })
    }

    onSaved(schedule?.id)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h4 className="text-sm font-bold mb-4">스케줄 등록</h4>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">촬영종류 *</label>
          <select value={shootTypeId} onChange={e => setShootTypeId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            {shootTypes.map(t => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">인원 *</label>
          <input type="number" min={1} value={peopleCount} onChange={e => setPeopleCount(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">촬영일 *</label>
          <input type="date" value={shootDate} onChange={e => setShootDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
        </div>
        <div className="flex gap-2">
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">시작 *</label>
            <select value={startAt} onChange={e => setStartAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-xs text-gray-500 mb-1">종료 *</label>
            <select value={endAt} onChange={e => setEndAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              {TIME_OPTIONS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">예약상태</label>
          <select value={status} onChange={e => setStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="wait">확정대기</option>
            <option value="confirmed">확정</option>
            <option value="canceled">취소</option>
            <option value="noshow">노쇼</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">예약금</label>
          <select value={depositStatus} onChange={e => setDepositStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option value="pending">입금대기</option>
            <option value="paid">입금완료</option>
            <option value="nodeposit">면제</option>
            <option value="refunded">환불완료</option>
          </select>
        </div>
      </div>
      <div className="mt-3">
        <label className="block text-xs text-gray-500 mb-1">메모</label>
        <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} placeholder="촬영 메모"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" />
      </div>

      {/* 할일 연계 */}
      <div className="mt-3 border border-gray-200 rounded-lg p-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={todoEnabled} onChange={e => setTodoEnabled(e.target.checked)} />
          <span className="text-xs text-gray-600 font-medium">할일도 같이 등록</span>
        </label>
        {todoEnabled && (
          <div className="mt-2 space-y-2">
            <input type="text" value={todoNote} onChange={e => setTodoNote(e.target.value)}
              placeholder="할일 내용" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">담당:</label>
              <select value={todoAssignedId} onChange={e => setTodoAssignedId(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs">
                {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button onClick={handleSubmit} disabled={saving}
          className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50">
          {saving ? '저장 중...' : '등록'}
        </button>
        <button onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 cursor-pointer">
          취소
        </button>
      </div>
    </div>
  )
}