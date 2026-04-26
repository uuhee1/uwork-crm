'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import { useRouter } from 'next/navigation'

type CustomerResult = {
  id: string
  name: string
  phone: string | null
  phone_last4: string | null
  group_name: string
}

const PRESET_TAGS = [
  '가격문의','액자문의','의상문의','일정문의','시간변경',
  '취소문의','보정요청','인화문의','배송문의','재촬영문의',
  '메이크업문의','소품문의','콜백요청','급건',
]

export default function CustomerConsultPage() {
  const router = useRouter()
  const [staffId, setStaffId] = useState('')
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([])
  const [saving, setSaving] = useState(false)

  // 상담 내용
  const [content, setContent] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [showTagSuggestions, setShowTagSuggestions] = useState(false)
  const [todoNote, setTodoNote] = useState('')
  const [todoAssignedId, setTodoAssignedId] = useState('')
  const [createdAt, setCreatedAt] = useState('')
  const [linkType, setLinkType] = useState('new_shoot')

  // 고객 연결 모드
  const [customerMode, setCustomerMode] = useState<'search' | 'new'>('search')
  const [linkedCustomer, setLinkedCustomer] = useState<CustomerResult | null>(null)

  // 고객 검색
  const [searchKeyword, setSearchKeyword] = useState('')
  const [searchResults, setSearchResults] = useState<CustomerResult[]>([])
  const [searching, setSearching] = useState(false)

  // 신규 고객 등록
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')
  const [newGroup, setNewGroup] = useState('유유히')
  const [newMemo, setNewMemo] = useState('')

  const contentRef = useRef<HTMLTextAreaElement>(null)
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    loadInit()
  }, [])

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

  // 고객 검색
  async function handleSearch() {
    if (!searchKeyword.trim()) return
    setSearching(true)
    const k = searchKeyword.trim()
    const isPhone = /^\d{2,}$/.test(k)
    let query = supabase.from('customers').select('id, name, phone, phone_last4, group_name').eq('is_deleted', false)
    if (isPhone) query = query.eq('phone_last4', k.slice(-4))
    else query = query.ilike('name', `%${k}%`)
    const { data } = await query.order('created_at', { ascending: false }).limit(20)
    setSearchResults(data || [])
    setSearching(false)
  }

  function selectCustomer(c: CustomerResult) {
    setLinkedCustomer(c)
    setSearchResults([])
    setSearchKeyword('')
  }

  // 태그
  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }
  function handleTagInputKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addCustomTag() }
  }
  function addCustomTag() {
    const tag = tagInput.trim().replace(/^#/, '')
    if (tag && !selectedTags.includes(tag)) setSelectedTags(prev => [...prev, tag])
    setTagInput('')
    setShowTagSuggestions(false)
  }
  function getFilteredSuggestions() {
    if (!tagInput.trim()) return []
    const input = tagInput.trim().replace(/^#/, '').toLowerCase()
    return PRESET_TAGS.filter(t => t.toLowerCase().includes(input) && !selectedTags.includes(t))
  }
  function selectSuggestion(tag: string) {
    if (!selectedTags.includes(tag)) setSelectedTags(prev => [...prev, tag])
    setTagInput('')
    setShowTagSuggestions(false)
    tagInputRef.current?.focus()
  }
  function removeTag(tag: string) {
    setSelectedTags(prev => prev.filter(t => t !== tag))
  }

  // 저장
  async function handleSubmit() {
    if (!content.trim() && !todoNote.trim()) {
      alert('상담 내용 또는 할일을 입력하세요.')
      return
    }

    let customerId = linkedCustomer?.id

    if (!customerId && customerMode === 'new') {
      if (!newName.trim()) {
        alert('고객 이름을 입력하세요.')
        return
      }
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
          memo: newMemo.trim() || null,
        })
        .select('id, name, phone, phone_last4, group_name')
        .single()

      if (custErr || !newCust) {
        alert('고객 등록 실패: ' + (custErr?.message || ''))
        return
      }
      customerId = newCust.id
      setLinkedCustomer(newCust)
    }

    if (!customerId) {
      alert('고객을 검색하여 선택하거나, 신규 등록해주세요.')
      return
    }

    setSaving(true)

    const hasTodo = todoNote.trim().length > 0

    const { error } = await supabase
      .from('consultations')
      .insert({
        customer_id: customerId,
        schedule_id: null,
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
      alert('상담 저장 실패: ' + error.message)
      setSaving(false)
      return
    }

    router.push(`/search?customer_id=${customerId}`)
  }

  const suggestions = getFilteredSuggestions()

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-bold mb-6">고객/상담 등록</h2>

          {/* ===== 고객 연결 (먼저) ===== */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-sm font-bold">고객 연결</h3>
              {linkedCustomer && (
                <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700">
                  ✓ {linkedCustomer.name} ({linkedCustomer.phone || '번호없음'})
                </span>
              )}
            </div>

            {!linkedCustomer ? (
              <>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setCustomerMode('search')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
                      customerMode === 'search' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    기존 고객 검색
                  </button>
                  <button
                    onClick={() => setCustomerMode('new')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${
                      customerMode === 'new' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    신규 고객 등록
                  </button>
                </div>

                {customerMode === 'search' && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={searchKeyword}
                        onChange={e => setSearchKeyword(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSearch() }}
                        placeholder="이름 또는 전화 뒤4자리"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                      />
                      <button
                        onClick={handleSearch}
                        disabled={searching}
                        className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer"
                      >
                        검색
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
                        {searchResults.map(c => (
                          <button
                            key={c.id}
                            onClick={() => selectCustomer(c)}
                            className="w-full text-left px-4 py-3 border-b border-gray-100 last:border-b-0 hover:bg-gray-50 cursor-pointer transition"
                          >
                            <span className="font-medium text-sm">{c.name}</span>
                            <span className="text-xs text-gray-400 ml-2">{c.phone || '번호없음'}</span>
                            <span className="text-xs text-gray-400 ml-2">{c.group_name}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {searchResults.length === 0 && searching === false && searchKeyword && (
                      <p className="text-xs text-gray-400 text-center py-2">검색 결과가 없습니다. 신규 등록하세요.</p>
                    )}
                  </div>
                )}

                {customerMode === 'new' && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">이름 *</label>
                        <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="고객 이름"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">전화번호</label>
                        <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} placeholder="010-1234-5678"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">소속</label>
                        <select value={newGroup} onChange={e => setNewGroup(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                          <option value="유유히">유유히</option><option value="모디온">모디온</option><option value="웨이블루">웨이블루</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">메모</label>
                        <input type="text" value={newMemo} onChange={e => setNewMemo(e.target.value)} placeholder="간단 메모"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
                      </div>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <button onClick={() => setLinkedCustomer(null)} className="text-xs text-gray-500 hover:text-gray-700 cursor-pointer underline">
                다른 고객으로 변경
              </button>
            )}
          </div>

          {/* ===== 구분선 ===== */}
          <div className="border-t border-gray-200 pt-6">

          {/* ===== 상담 내용 ===== */}
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">상담 유형</label>
                <select value={linkType} onChange={e => setLinkType(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900">
                  <option value="new_shoot">새촬영예정</option>
                  <option value="etc_inquiry">기타문의</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">상담일시</label>
                <input type="datetime-local" value={createdAt} onChange={e => setCreatedAt(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">상담 내용</label>
              <textarea
                ref={contentRef}
                value={content}
                onChange={e => setContent(e.target.value)}
                rows={4}
                placeholder="전화/카카오 등 상담 내용을 기록하세요..."
                className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 resize-none"
              />
            </div>

            {/* 태그 */}
            <div>
              <label className="block text-xs text-gray-500 mb-2">태그</label>
              {selectedTags.length > 0 && (
                <div className="flex gap-1.5 flex-wrap mb-2">
                  {selectedTags.map(tag => (
                    <span key={tag} className="px-2 py-0.5 rounded-full text-xs bg-gray-900 text-white flex items-center gap-1">
                      {tag}
                      <button onClick={() => removeTag(tag)} className="hover:text-red-300 cursor-pointer">×</button>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5 flex-wrap mb-2">
                {PRESET_TAGS.filter(t => !selectedTags.includes(t)).map(tag => (
                  <button key={tag} onClick={() => toggleTag(tag)} className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer transition">{tag}</button>
                ))}
              </div>
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
                      <button key={tag} onMouseDown={() => selectSuggestion(tag)} className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer">{tag}</button>
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
                  <select value={todoAssignedId} onChange={e => setTodoAssignedId(e.target.value)}
                    className="px-2 py-1 border border-gray-200 rounded text-xs">
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>
              <input
                type="text"
                value={todoNote}
                onChange={e => setTodoNote(e.target.value)}
                placeholder="예: 콜백 요청. 5시 이후 전화."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
            </div>
          </div>

          </div>

          {/* 등록 버튼 */}
          <div className="flex gap-2 pt-4 border-t border-gray-200">
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50"
            >
              {saving ? '저장 중...' : '등록'}
            </button>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}