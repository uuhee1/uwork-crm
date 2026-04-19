'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'

type LinkItem = {
  id: string
  category: string
  title: string
  content: string
  is_important: boolean
  created_by: string | null
  updated_by: string | null
  created_at: string
  updated_at: string
  staff_created: { name: string } | null
  staff_updated: { name: string } | null
}

const CATEGORIES = [
  { value: '', label: '전체' },
  { value: '거래처단가', label: '거래처단가' },
  { value: '물품구매', label: '물품구매' },
  { value: '스튜디오내부', label: '스튜디오 내부' },
  { value: '서비스아이디', label: '각종 서비스 아이디' },
  { value: '기타', label: '기타' },
]

export default function LinksPage() {
  const [items, setItems] = useState<LinkItem[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState('')
  const [searchKeyword, setSearchKeyword] = useState('')
  const [currentStaffId, setCurrentStaffId] = useState('')

  // 편집 모드
  const [editingItem, setEditingItem] = useState<LinkItem | null>(null)
  const [showForm, setShowForm] = useState(false)

  // 폼 데이터
  const [formCategory, setFormCategory] = useState('기타')
  const [formTitle, setFormTitle] = useState('')
  const [formContent, setFormContent] = useState('')
  const [formImportant, setFormImportant] = useState(false)
  const [saving, setSaving] = useState(false)

  // 상세 보기
  const [expandedId, setExpandedId] = useState<string | null>(null)

  useEffect(() => {
    loadInit()
  }, [])

  useEffect(() => {
    if (currentStaffId) loadItems()
  }, [categoryFilter, currentStaffId])

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staff } = await supabase
        .from('staff')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()
      if (staff) setCurrentStaffId(staff.id)
    }
  }

  async function loadItems() {
    setLoading(true)
    let query = supabase
      .from('links')
      .select('*, staff_created:created_by ( name ), staff_updated:updated_by ( name )')
      .order('is_important', { ascending: false })
      .order('updated_at', { ascending: false })

    if (categoryFilter) {
      query = query.eq('category', categoryFilter)
    }

    const { data } = await query.limit(200)
    setItems(data || [])
    setLoading(false)
  }

  function openNewForm() {
    setEditingItem(null)
    setFormCategory('기타')
    setFormTitle('')
    setFormContent('')
    setFormImportant(false)
    setShowForm(true)
  }

  function openEditForm(item: LinkItem) {
    setEditingItem(item)
    setFormCategory(item.category)
    setFormTitle(item.title)
    setFormContent(item.content)
    setFormImportant(item.is_important)
    setShowForm(true)
  }

  async function handleSave() {
    if (!formTitle.trim()) { alert('제목을 입력하세요.'); return }
    if (!formContent.trim()) { alert('내용을 입력하세요.'); return }

    setSaving(true)

    if (editingItem) {
      // 수정
      const { error } = await supabase
        .from('links')
        .update({
          category: formCategory,
          title: formTitle.trim(),
          content: formContent.trim(),
          is_important: formImportant,
          updated_by: currentStaffId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', editingItem.id)

      if (error) { alert('수정 실패: ' + error.message); setSaving(false); return }
    } else {
      // 신규
      const { error } = await supabase
        .from('links')
        .insert({
          category: formCategory,
          title: formTitle.trim(),
          content: formContent.trim(),
          is_important: formImportant,
          created_by: currentStaffId,
          updated_by: currentStaffId,
        })

      if (error) { alert('저장 실패: ' + error.message); setSaving(false); return }
    }

    setShowForm(false)
    setSaving(false)
    loadItems()
  }

  async function handleDelete(id: string) {
    if (!confirm('정말 삭제하시겠습니까?')) return
    const { error } = await supabase.from('links').delete().eq('id', id)
    if (error) { alert('삭제 실패: ' + error.message); return }
    loadItems()
  }

  function formatDate(iso: string) {
    if (!iso) return '-'
    const d = new Date(iso)
    const yy = String(d.getFullYear()).slice(2)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yy}-${mm}-${dd}`
  }

  const filteredItems = searchKeyword.trim()
    ? items.filter(i =>
        i.title.toLowerCase().includes(searchKeyword.toLowerCase()) ||
        i.content.toLowerCase().includes(searchKeyword.toLowerCase())
      )
    : items

  return (
    <MainLayout>
      <div className="max-w-5xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">LINKS</h2>
          <button
            onClick={openNewForm}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer"
          >
            + 새 메모
          </button>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="flex gap-1.5">
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setCategoryFilter(cat.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    categoryFilter === cat.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
            <div className="w-px h-6 bg-gray-200" />
            <input
              type="text"
              value={searchKeyword}
              onChange={e => setSearchKeyword(e.target.value)}
              placeholder="검색어"
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs w-48"
            />
          </div>
        </div>

        {/* 폼 모달 */}
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30" onClick={() => setShowForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold">{editingItem ? '메모 수정' : '새 메모'}</h3>
                  <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">✕</button>
                </div>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">분류</label>
                      <select value={formCategory} onChange={e => setFormCategory(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
                        {CATEGORIES.filter(c => c.value).map(c => (
                          <option key={c.value} value={c.value}>{c.label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-end">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={formImportant} onChange={e => setFormImportant(e.target.checked)} className="w-4 h-4" />
                        <span className="text-sm text-red-600 font-medium">중요</span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">제목 *</label>
                    <input type="text" value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="제목" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">내용 *</label>
                    <textarea value={formContent} onChange={e => setFormContent(e.target.value)} rows={8} placeholder="내용을 입력하세요" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none font-mono" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <button onClick={handleSave} disabled={saving} className="flex-1 py-2.5 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50">
                      {saving ? '저장 중...' : (editingItem ? '수정' : '등록')}
                    </button>
                    <button onClick={() => setShowForm(false)} className="flex-1 py-2.5 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer">취소</button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 목록 */}
        {loading ? (
          <div className="text-center text-gray-400 py-12 text-sm">로딩 중...</div>
        ) : filteredItems.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">등록된 메모가 없습니다</div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">분류</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">내용</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-20">작성자</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 w-24">수정일</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 w-16">중요</th>
                  <th className="text-center px-4 py-3 font-medium text-gray-600 w-20"></th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map(item => (
                  <tr key={item.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        {CATEGORIES.find(c => c.value === item.category)?.label || item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                        className="text-left cursor-pointer hover:text-blue-600"
                      >
                        <span className="font-medium">{item.title}</span>
                      </button>
                      {expandedId === item.id && (
                        <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-700 whitespace-pre-wrap font-mono">
                          {item.content}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">{item.staff_created?.name || '-'}</td>
                    <td className="px-4 py-3 text-xs text-gray-400">{formatDate(item.updated_at)}</td>
                    <td className="px-4 py-3 text-center">
                      {item.is_important && <span className="text-red-500 text-xs font-medium">중요</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex gap-1 justify-center">
                        <button onClick={() => openEditForm(item)} className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer">수정</button>
                        <button onClick={() => handleDelete(item.id)} className="px-2 py-1 text-xs text-red-400 hover:text-red-600 cursor-pointer">삭제</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </MainLayout>
  )
}
