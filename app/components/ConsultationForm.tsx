'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'

type ScheduleOption = {
  id: string
  label: string
}

type Props = {
  customerId: string
  schedules: ScheduleOption[]
  mode: 'consultation' | 'todo'
  onSaved: () => void
  onCancel: () => void
}

const PRESET_TAGS = [
  '가격문의','액자문의','의상문의','일정문의','시간변경',
  '취소문의','보정요청','인화문의','배송문의','재촬영문의',
  '메이크업문의','소품문의','콜백요청','급건',
]

export default function ConsultationForm({ customerId, schedules, mode, onSaved, onCancel }: Props) {
  const [staffId, setStaffId] = useState('')
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  const [linkType, setLinkType] = useState('new_shoot')
  const [scheduleId, setScheduleId] = useState('')
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [todoNote, setTodoNote] = useState('')
  const [todoAssignedId, setTodoAssignedId] = useState('')
  const [createdAt, setCreatedAt] = useState('')

  const tagInputRef = useRef<HTMLInputElement>(null)
  const contentRef = useRef<HTMLTextAreaElement>(null)
  const todoRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadInit()
  }, [])

  // 모드에 따라 포커스
  useEffect(() => {
    setTimeout(() => {
      if (mode === 'todo') {
        todoRef.current?.focus()
      } else {
        contentRef.current?.focus()
      }
    }, 100)
  }, [mode])

  async function loadInit() {
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

    const now = new Date()
    const yyyy = now.getFullYear()
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const dd = String(now.getDate()).padStart(2, '0')
    const hh = String(now.getHours()).padStart(2, '0')
    const mi = String(now.getMinutes()).padStart(2, '0')
    setCreatedAt(`${yyyy}-${mm}-${dd}T${hh}:${mi}`)
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  function handleTagInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      addCustomTag()
    }
  }

  function addCustomTag() {
    const tag = tagInput.trim().replace(/^#/, '')
    if (tag && !selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag])
    }
    setTagInput('')
    setShowTagSuggestions(false)
  }

  function getFilteredSuggestions() {
    if (!tagInput.trim()) return []
    const input = tagInput.trim().replace(/^#/, '').toLowerCase()
    return PRESET_TAGS.filter(t =>
      t.toLowerCase().includes(input) && !selectedTags.includes(t)
    )
  }

  function selectSuggestion(tag: string) {
    if (!selectedTags.includes(tag)) {
      setSelectedTags(prev => [...prev, tag])
    }
    setTagInput('')
    setShowTagSuggestions(false)
    tagInputRef.current?.focus()
  }

  function removeTag(tag: string) {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  function handleLinkChange(value: string) {
    if (value === 'new_shoot' || value === 'etc_inquiry') {
      setLinkType(value)
      setScheduleId('')
    } else {
      setLinkType('linked')
      setScheduleId(value)
    }
  }

  async function handleSubmit() {
    if (!content.trim() && !todoNote.trim()) {
      alert('상담 내용 또는 할일을 입력하세요.')
      return
    }

    setSaving(true)

    const hasTodo = todoNote.trim().length > 0

    const { error } = await supabase
      .from('consultations')
      .insert({
        customer_id: customerId,
        schedule_id: scheduleId || null,
        link_type: linkType,
        content: content.trim() || (hasTodo ? '(할일 등록)' : ''),
        tags: selectedTags.length > 0 ? selectedTags : null,
        has_todo: hasTodo,
        todo_done: false,
        todo_note: hasTodo ? todoNote.trim() : null,
        staff_id: staffId,
        todo_assigned_id: hasTodo ? todoAssignedId : null,
        created_at: createdAt ? new Date(createdAt).toISOString() : new Date().toISOString(),
      })

    if (error) {
      alert('저장 실패: ' + error.message)
      setSaving(false)
      return
    }

    onSaved()
  }

  const suggestions = getFilteredSuggestions()

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h4 className="text-sm font-bold mb-4">
        {mode === 'todo' ? '할일 등록' : '상담 등록'}
      </h4>

      <div className="space-y-3">
        {/* 상단: 연결된 촬영 + 상담일시 */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">연결된 촬영</label>
            <select
              value={linkType === 'linked' ? scheduleId : linkType}
              onChange={e => handleLinkChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="new_shoot">새촬영예정</option>
              <option value="etc_inquiry">기타문의</option>
              {schedules.length > 0 && (
                <option disabled>── 예약된 촬영 ──</option>
              )}
              {schedules.map(s => (
                <option key={s.id} value={s.id}>{s.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">상담일시</label>
            <input
              type="datetime-local"
              value={createdAt}
              onChange={e => setCreatedAt(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* 상담 내용 */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">상담내용 {mode === 'consultation' ? '*' : ''}</label>
          <textarea
            ref={contentRef}
            value={content}
            onChange={e => setContent(e.target.value)}
            rows={3}
            placeholder="상담 내용을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* 태그 (상담내용과 할일 사이) */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">태그</label>
          {/* 선택된 태그 */}
          {selectedTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {selectedTags.map(tag => (
                <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs bg-gray-900 text-white">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="hover:text-gray-300 cursor-pointer">×</button>
                </span>
              ))}
            </div>
          )}
          {/* 프리셋 태그 버튼 */}
          <div className="flex flex-wrap gap-1 mb-2">
            {PRESET_TAGS.filter(t => !selectedTags.includes(t)).map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition"
              >
                {tag}
              </button>
            ))}
          </div>
          {/* 직접 입력 + 자동완성 */}
          <div className="relative">
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={e => { setTagInput(e.target.value); setShowTagSuggestions(true) }}
              onKeyDown={handleTagInputKeyDown}
              onFocus={() => setShowTagSuggestions(true)}
              onBlur={() => setTimeout(() => setShowTagSuggestions(false), 150)}
              placeholder="태그 직접 입력 후 Enter"
              className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-gray-400"
            />
            {showTagSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10 max-h-32 overflow-y-auto">
                {suggestions.map(tag => (
                  <button
                    key={tag}
                    onMouseDown={() => selectSuggestion(tag)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 할일 */}
        <div className="border border-gray-200 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-500">할일 (있으면 입력)</label>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-500">담당:</label>
              <select
                value={todoAssignedId}
                onChange={e => setTodoAssignedId(e.target.value)}
                className="px-2 py-1 border border-gray-200 rounded text-xs"
              >
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
          </div>
          <input
            ref={todoRef}
            type="text"
            value={todoNote}
            onChange={e => setTodoNote(e.target.value)}
            placeholder="예: 콜백 요청. 5시 이후 전화."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* 버튼 */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50"
          >
            {saving ? '저장 중...' : '등록'}
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm hover:bg-gray-50 cursor-pointer"
          >
            취소
          </button>
        </div>
      </div>
    </div>
  )
}