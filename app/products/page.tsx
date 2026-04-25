'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'

// ─── 타입 ─────────────────────────────────────────
type PriceTable = {
  id: string
  version_code: string
  name: string
  effective_from: string | null
  effective_to: string | null
  is_active: boolean
  memo: string | null
  created_at: string
}

type PricePackage = {
  id: string
  price_table_id: string
  category: string
  category_name: string
  code: string
  name: string
  base_people: number
  base_price: number
  extra_people_unit_price: number
  deposit_amount: number
  process_steps: string | null
  notice: string | null
  is_active: boolean
  sort_order: number
}

type PriceItem = {
  id: string
  price_table_id: string
  item_category: string
  item_category_name: string
  code: string
  name: string
  price_unit_type: string
  base_unit: number
  unit_label: string
  base_price: number
  extra_unit_price: number
  sort_order: number
  is_active: boolean
}

type PriceItemOption = {
  id: string
  item_id: string
  option_name: string
  price_diff: number
  is_default: boolean
  sort_order: number
  is_active: boolean
}

type PricePackageItem = {
  id: string
  package_id: string
  item_id: string
  qty: number
  retouch_base_people: number | null
  retouch_extra_per_person: number
  sort_order: number
  memo: string | null
}

type Tab = 'tables' | 'packages' | 'items'

const fmtPrice = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

// ─── 메인 컴포넌트 ────────────────────────────────
export default function ProductsPage() {
  const [tab, setTab] = useState<Tab>('packages')
  const [tables, setTables] = useState<PriceTable[]>([])
  const [selectedTableId, setSelectedTableId] = useState<string>('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTables()
  }, [])

  async function loadTables() {
    const { data } = await supabase
      .from('price_tables')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) {
      setTables(data)
      const active = data.find(t => t.is_active)
      if (active) setSelectedTableId(active.id)
      else if (data.length > 0) setSelectedTableId(data[0].id)
    }
    setLoading(false)
  }

  const selectedTable = tables.find(t => t.id === selectedTableId)

  if (loading) {
    return (
      <MainLayout>
        <div className="min-h-screen flex items-center justify-center">
          <p className="text-gray-400">로딩 중...</p>
        </div>
      </MainLayout>
    )
  }

  return (
    <MainLayout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">상품 관리</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-500">가격표:</label>
            <select
              value={selectedTableId}
              onChange={e => setSelectedTableId(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              {tables.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.version_code}) {t.is_active ? '✓ 활성' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 탭 */}
        <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1 w-fit">
          {([
            { key: 'packages' as Tab, label: '패키지' },
            { key: 'items' as Tab, label: '아이템' },
            { key: 'tables' as Tab, label: '가격표 설정' },
          ]).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-2 text-sm rounded-md cursor-pointer transition ${
                tab === t.key
                  ? 'bg-white text-gray-900 shadow-sm font-medium'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'tables' && <TablesSection tables={tables} onReload={loadTables} />}
        {tab === 'packages' && selectedTableId && (
          <PackagesSection priceTableId={selectedTableId} />
        )}
        {tab === 'items' && selectedTableId && (
          <ItemsSection priceTableId={selectedTableId} />
        )}
      </div>
    </MainLayout>
  )
}

// ─── 가격표 설정 탭 ───────────────────────────────
function TablesSection({ tables, onReload }: { tables: PriceTable[]; onReload: () => void }) {
  const [editing, setEditing] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [form, setForm] = useState({
    version_code: '', name: '', effective_from: '', effective_to: '', is_active: false, memo: '',
  })
  const [saving, setSaving] = useState(false)

  function startEdit(t: PriceTable) {
    setEditing(t.id)
    setForm({
      version_code: t.version_code,
      name: t.name,
      effective_from: t.effective_from || '',
      effective_to: t.effective_to || '',
      is_active: t.is_active,
      memo: t.memo || '',
    })
    setShowNew(false)
  }

  function startNew() {
    setShowNew(true)
    setEditing(null)
    setForm({ version_code: '', name: '', effective_from: '', effective_to: '', is_active: false, memo: '' })
  }

  async function handleSave() {
    if (!form.version_code.trim() || !form.name.trim()) {
      alert('버전코드와 이름은 필수입니다')
      return
    }
    setSaving(true)
    const payload = {
      version_code: form.version_code.trim(),
      name: form.name.trim(),
      effective_from: form.effective_from || null,
      effective_to: form.effective_to || null,
      is_active: form.is_active,
      memo: form.memo.trim() || null,
    }

    if (editing) {
      await supabase.from('price_tables').update(payload).eq('id', editing)
    } else {
      await supabase.from('price_tables').insert(payload)
    }
    setSaving(false)
    setEditing(null)
    setShowNew(false)
    onReload()
  }

  function renderForm() {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
        <h3 className="font-medium mb-4">{editing ? '가격표 수정' : '새 가격표'}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">버전코드 *</label>
            <input value={form.version_code} onChange={e => setForm(f => ({ ...f, version_code: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="예: v2024-01" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">이름 *</label>
            <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="예: 2024년 1월 가격표" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">시작일</label>
            <input type="date" value={form.effective_from} onChange={e => setForm(f => ({ ...f, effective_from: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">종료일</label>
            <input type="date" value={form.effective_to} onChange={e => setForm(f => ({ ...f, effective_to: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">메모</label>
            <input value={form.memo} onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
          </div>
          <div className="col-span-2 flex items-center gap-2">
            <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
            <label htmlFor="is_active" className="text-sm">활성 (현재 사용 중인 가격표)</label>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
            {saving ? '저장 중...' : '저장'}
          </button>
          <button onClick={() => { setEditing(null); setShowNew(false) }}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
            취소
          </button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={startNew} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer">
          + 가격표 추가
        </button>
      </div>
      {(showNew || editing) && renderForm()}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left px-4 py-3 font-medium text-gray-600">버전</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">이름</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">기간</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">상태</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">메모</th>
              <th className="text-center px-4 py-3 font-medium text-gray-600">관리</th>
            </tr>
          </thead>
          <tbody>
            {tables.map(t => (
              <tr key={t.id} className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs">{t.version_code}</td>
                <td className="px-4 py-3 font-medium">{t.name}</td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {t.effective_from || '-'} ~ {t.effective_to || '-'}
                </td>
                <td className="px-4 py-3 text-center">
                  <span className={`text-xs px-2 py-0.5 rounded ${t.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {t.is_active ? '활성' : '비활성'}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs truncate max-w-[200px]">{t.memo || '-'}</td>
                <td className="px-4 py-3 text-center">
                  <button onClick={() => startEdit(t)} className="text-blue-600 hover:underline text-xs cursor-pointer">수정</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ─── 패키지 탭 ────────────────────────────────────
function PackagesSection({ priceTableId }: { priceTableId: string }) {
  const [packages, setPackages] = useState<PricePackage[]>([])
  const [items, setItems] = useState<PriceItem[]>([])
  const [packageItems, setPackageItems] = useState<PricePackageItem[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [expandedPkg, setExpandedPkg] = useState<string | null>(null)

  // 패키지 폼
  const emptyForm = {
    category: '', category_name: '', code: '', name: '',
    base_people: 0, base_price: 0, extra_people_unit_price: 0,
    deposit_amount: 0, process_steps: '', notice: '', is_active: true, sort_order: 0,
  }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // 패키지 구성 아이템 편집
  const [editingComposition, setEditingComposition] = useState(false)
  const [compositionLines, setCompositionLines] = useState<PricePackageItem[]>([])

  useEffect(() => {
    load()
  }, [priceTableId])

  async function load() {
    setLoading(true)
    const [pkgRes, itemRes, piRes] = await Promise.all([
      supabase.from('price_packages').select('*').eq('price_table_id', priceTableId).order('sort_order'),
      supabase.from('price_items').select('*').eq('price_table_id', priceTableId).order('sort_order'),
      supabase.from('price_package_items').select('*').order('sort_order'),
    ])
    if (pkgRes.data) setPackages(pkgRes.data as any)
    if (itemRes.data) setItems(itemRes.data as any)
    if (piRes.data) setPackageItems(piRes.data as any)
    setLoading(false)
  }

  function startEdit(p: PricePackage) {
    setEditing(p.id)
    setShowNew(false)
    setForm({
      category: p.category,
      category_name: p.category_name,
      code: p.code,
      name: p.name,
      base_people: p.base_people,
      base_price: p.base_price,
      extra_people_unit_price: p.extra_people_unit_price || 0,
      deposit_amount: p.deposit_amount || 0,
      process_steps: p.process_steps || '',
      notice: p.notice || '',
      is_active: p.is_active,
      sort_order: p.sort_order,
    })
  }

  function startNew() {
    setShowNew(true)
    setEditing(null)
    const maxSort = packages.length > 0 ? Math.max(...packages.map(p => p.sort_order)) + 1 : 1
    setForm({ ...emptyForm, sort_order: maxSort })
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim() || !form.category.trim()) {
      alert('카테고리, 코드, 이름은 필수입니다')
      return
    }
    setSaving(true)
    const payload = {
      price_table_id: priceTableId,
      category: form.category.trim(),
      category_name: form.category_name.trim() || form.category.trim(),
      code: form.code.trim(),
      name: form.name.trim(),
      base_people: form.base_people,
      base_price: form.base_price,
      extra_people_unit_price: form.extra_people_unit_price,
      deposit_amount: form.deposit_amount,
      process_steps: form.process_steps.trim() || null,
      notice: form.notice.trim() || null,
      is_active: form.is_active,
      sort_order: form.sort_order,
    }

    if (editing) {
      await supabase.from('price_packages').update(payload).eq('id', editing)
    } else {
      await supabase.from('price_packages').insert(payload)
    }
    setSaving(false)
    setEditing(null)
    setShowNew(false)
    load()
  }

  // 패키지 구성 편집
  function openComposition(pkgId: string) {
    setExpandedPkg(pkgId)
    setEditingComposition(true)
    const existing = packageItems.filter(pi => pi.package_id === pkgId)
    setCompositionLines(existing.map(e => ({ ...e })))
  }

  function addCompositionLine(pkgId: string) {
    if (items.length === 0) return
    setCompositionLines(prev => [...prev, {
      id: `new_${Date.now()}`,
      package_id: pkgId,
      item_id: items[0].id,
      qty: 1,
      retouch_base_people: 4,
      retouch_extra_per_person: 10000,
      sort_order: prev.length + 1,
      memo: null,
    }])
  }

  function updateCompositionLine(idx: number, patch: Partial<PricePackageItem>) {
    setCompositionLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  function deleteCompositionLine(idx: number) {
    setCompositionLines(prev => prev.filter((_, i) => i !== idx))
  }

  async function saveComposition(pkgId: string) {
    // 기존 삭제 후 새로 넣기
    await supabase.from('price_package_items').delete().eq('package_id', pkgId)

    if (compositionLines.length > 0) {
      const inserts = compositionLines.map((l, idx) => ({
        package_id: pkgId,
        item_id: l.item_id,
        qty: l.qty,
        retouch_base_people: l.retouch_base_people,
        retouch_extra_per_person: l.retouch_extra_per_person || 0,
        sort_order: idx + 1,
        memo: l.memo || null,
      }))
      await supabase.from('price_package_items').insert(inserts)
    }

    setEditingComposition(false)
    load()
  }

  // 카테고리 목록 (기존 패키지에서 추출)
  const categories = [...new Set(packages.map(p => p.category))]

  if (loading) return <div className="text-center text-gray-400 py-8 text-sm">로딩 중...</div>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={startNew} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer">
          + 패키지 추가
        </button>
      </div>

      {/* 패키지 폼 */}
      {(showNew || editing) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h3 className="font-medium mb-4">{editing ? '패키지 수정' : '새 패키지'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">카테고리 코드 *</label>
              <input value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="family" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">카테고리명 *</label>
              <input value={form.category_name} onChange={e => setForm(f => ({ ...f, category_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="가족" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">코드 *</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="FAM-A" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">이름 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="가족A (4인 기준)" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">기본 인원</label>
              <input type="number" value={form.base_people} onChange={e => setForm(f => ({ ...f, base_people: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">기본가</label>
              <input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">추가인원 단가</label>
              <input type="number" value={form.extra_people_unit_price} onChange={e => setForm(f => ({ ...f, extra_people_unit_price: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">예약금</label>
              <input type="number" value={form.deposit_amount} onChange={e => setForm(f => ({ ...f, deposit_amount: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">정렬순서</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">작업절차</label>
              <textarea value={form.process_steps} onChange={e => setForm(f => ({ ...f, process_steps: e.target.value }))}
                rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
            </div>
            <div className="col-span-3">
              <label className="block text-xs text-gray-500 mb-1">유의사항</label>
              <textarea value={form.notice} onChange={e => setForm(f => ({ ...f, notice: e.target.value }))}
                rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
            </div>
            <div className="col-span-3 flex items-center gap-2">
              <input type="checkbox" id="pkg_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="pkg_active" className="text-sm">활성</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={() => { setEditing(null); setShowNew(false) }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 패키지 리스트 */}
      {categories.map(cat => {
        const catPkgs = packages.filter(p => p.category === cat)
        const catName = catPkgs[0]?.category_name || cat

        return (
          <div key={cat} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{catName} ({cat})</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-12">순서</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">코드</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">이름</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">기본인원</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">기본가</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">추가인원 단가</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">예약금</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">상태</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {catPkgs.map(p => (
                    <Fragment key={p.id}>
                      <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                        <td className="px-4 py-2 text-gray-400">{p.sort_order}</td>
                        <td className="px-4 py-2 font-mono text-xs">{p.code}</td>
                        <td className="px-4 py-2 font-medium">{p.name}</td>
                        <td className="px-4 py-2 text-right">{p.base_people}인</td>
                        <td className="px-4 py-2 text-right">{fmtPrice(p.base_price)}</td>
                        <td className="px-4 py-2 text-right">{fmtPrice(p.extra_people_unit_price || 0)}</td>
                        <td className="px-4 py-2 text-right">{fmtPrice(p.deposit_amount || 0)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded ${p.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {p.is_active ? '활성' : '비활성'}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <div className="flex gap-2 justify-center">
                            <button onClick={() => startEdit(p)} className="text-blue-600 hover:underline text-xs cursor-pointer">수정</button>
                            <button onClick={() => openComposition(p.id)}
                              className="text-purple-600 hover:underline text-xs cursor-pointer">
                              구성 {expandedPkg === p.id ? '▲' : '▼'}
                            </button>
                          </div>
                        </td>
                      </tr>
                      {/* 패키지 구성 아이템 (확장 영역) */}
                      {expandedPkg === p.id && (
                        <tr key={`${p.id}_comp`}>
                          <td colSpan={9} className="bg-gray-50 px-6 py-4">
                            <div className="text-xs font-semibold text-gray-600 mb-3">패키지 구성 아이템</div>
                            {compositionLines.length === 0 && !editingComposition && (
                              <div className="text-xs text-gray-400 mb-2">구성 아이템이 없습니다</div>
                            )}
                            <div className="space-y-2">
                              {compositionLines.map((cl, idx) => {
                                const selectedItem = items.find(i => i.id === cl.item_id)
                                return (
                                  <div key={cl.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
                                    <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                                    <select
                                      value={cl.item_id}
                                      onChange={e => updateCompositionLine(idx, { item_id: e.target.value })}
                                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                                    >
                                      {items.map(it => (
                                        <option key={it.id} value={it.id}>
                                          [{it.item_category_name}] {it.name} ({it.code})
                                        </option>
                                      ))}
                                    </select>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">수량</span>
                                      <input type="number" min={1} value={cl.qty}
                                        onChange={e => updateCompositionLine(idx, { qty: Number(e.target.value) || 1 })}
                                        className="w-12 px-1 py-1 border border-gray-200 rounded text-xs text-center" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">보정기본</span>
                                      <input type="number" value={cl.retouch_base_people ?? ''}
                                        onChange={e => updateCompositionLine(idx, { retouch_base_people: e.target.value ? Number(e.target.value) : null })}
                                        className="w-12 px-1 py-1 border border-gray-200 rounded text-xs text-center" />
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">보정추가단가</span>
                                      <input type="number" value={cl.retouch_extra_per_person}
                                        onChange={e => updateCompositionLine(idx, { retouch_extra_per_person: Number(e.target.value) || 0 })}
                                        className="w-16 px-1 py-1 border border-gray-200 rounded text-xs text-center" />
                                    </div>
                                    <button onClick={() => deleteCompositionLine(idx)}
                                      className="text-gray-400 hover:text-red-500 text-xs cursor-pointer">✕</button>
                                  </div>
                                )
                              })}
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button onClick={() => addCompositionLine(p.id)}
                                className="px-3 py-1.5 text-xs border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 cursor-pointer">
                                + 아이템 추가
                              </button>
                              <button onClick={() => saveComposition(p.id)}
                                className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800">
                                구성 저장
                              </button>
                              <button onClick={() => { setExpandedPkg(null); setEditingComposition(false) }}
                                className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                닫기
                              </button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {packages.length === 0 && (
        <div className="text-center text-gray-400 py-12 text-sm bg-white rounded-2xl border border-gray-200">
          등록된 패키지가 없습니다
        </div>
      )}
    </div>
  )
}

// ─── 아이템 탭 ────────────────────────────────────
function ItemsSection({ priceTableId }: { priceTableId: string }) {
  const [itemsList, setItemsList] = useState<PriceItem[]>([])
  const [optionsList, setOptionsList] = useState<PriceItemOption[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<string | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)

  // 아이템 폼
  const emptyForm = {
    item_category: '', item_category_name: '', code: '', name: '',
    price_unit_type: 'qty', base_unit: 1, unit_label: '개',
    base_price: 0, extra_unit_price: 0, sort_order: 0, is_active: true,
  }
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)

  // 옵션 편집
  const [editingOptions, setEditingOptions] = useState(false)
  const [optionLines, setOptionLines] = useState<PriceItemOption[]>([])

  useEffect(() => {
    load()
  }, [priceTableId])

  async function load() {
    setLoading(true)
    const [itemRes, optRes] = await Promise.all([
      supabase.from('price_items').select('*').eq('price_table_id', priceTableId).order('item_category').order('sort_order'),
      supabase.from('price_item_options').select('*').order('sort_order'),
    ])
    if (itemRes.data) setItemsList(itemRes.data as any)
    if (optRes.data) setOptionsList(optRes.data as any)
    setLoading(false)
  }

  function startEdit(item: PriceItem) {
    setEditing(item.id)
    setShowNew(false)
    setForm({
      item_category: item.item_category,
      item_category_name: item.item_category_name,
      code: item.code,
      name: item.name,
      price_unit_type: item.price_unit_type,
      base_unit: item.base_unit || 1,
      unit_label: item.unit_label || '',
      base_price: item.base_price,
      extra_unit_price: item.extra_unit_price || 0,
      sort_order: item.sort_order,
      is_active: item.is_active,
    })
  }

  function startNew() {
    setShowNew(true)
    setEditing(null)
    const maxSort = itemsList.length > 0 ? Math.max(...itemsList.map(i => i.sort_order)) + 1 : 1
    setForm({ ...emptyForm, sort_order: maxSort })
  }

  async function handleSave() {
    if (!form.code.trim() || !form.name.trim() || !form.item_category.trim()) {
      alert('카테고리, 코드, 이름은 필수입니다')
      return
    }
    setSaving(true)
    const payload = {
      price_table_id: priceTableId,
      item_category: form.item_category.trim(),
      item_category_name: form.item_category_name.trim() || form.item_category.trim(),
      code: form.code.trim(),
      name: form.name.trim(),
      price_unit_type: form.price_unit_type,
      base_unit: form.base_unit,
      unit_label: form.unit_label.trim() || null,
      base_price: form.base_price,
      extra_unit_price: form.extra_unit_price,
      sort_order: form.sort_order,
      is_active: form.is_active,
    }

    if (editing) {
      await supabase.from('price_items').update(payload).eq('id', editing)
    } else {
      await supabase.from('price_items').insert(payload)
    }
    setSaving(false)
    setEditing(null)
    setShowNew(false)
    load()
  }

  // 옵션 편집
  function openOptions(itemId: string) {
    setExpandedItem(itemId)
    setEditingOptions(true)
    const existing = optionsList.filter(o => o.item_id === itemId)
    setOptionLines(existing.map(o => ({ ...o })))
  }

  function addOptionLine(itemId: string) {
    setOptionLines(prev => [...prev, {
      id: `new_${Date.now()}`,
      item_id: itemId,
      option_name: '',
      price_diff: 0,
      is_default: prev.length === 0,
      sort_order: prev.length + 1,
      is_active: true,
    }])
  }

  function updateOptionLine(idx: number, patch: Partial<PriceItemOption>) {
    setOptionLines(prev => prev.map((o, i) => {
      if (i !== idx) return o
      const updated = { ...o, ...patch }
      // is_default 토글 시 다른 것들 해제
      if (patch.is_default === true) {
        return updated
      }
      return updated
    }))
    // is_default 배타적 설정
    if (patch.is_default === true) {
      setOptionLines(prev => prev.map((o, i) => i === idx ? o : { ...o, is_default: false }))
    }
  }

  function deleteOptionLine(idx: number) {
    setOptionLines(prev => prev.filter((_, i) => i !== idx))
  }

  async function saveOptions(itemId: string) {
    // 기존 삭제 후 새로 넣기
    await supabase.from('price_item_options').delete().eq('item_id', itemId)

    if (optionLines.length > 0) {
      const inserts = optionLines.filter(o => o.option_name.trim()).map((o, idx) => ({
        item_id: itemId,
        option_name: o.option_name.trim(),
        price_diff: o.price_diff || 0,
        is_default: o.is_default,
        sort_order: idx + 1,
        is_active: o.is_active,
      }))
      if (inserts.length > 0) {
        await supabase.from('price_item_options').insert(inserts)
      }
    }

    setEditingOptions(false)
    load()
  }

  // 카테고리별 그룹
  const categories = [...new Set(itemsList.map(i => i.item_category))]

  if (loading) return <div className="text-center text-gray-400 py-8 text-sm">로딩 중...</div>

  return (
    <div>
      <div className="flex justify-end mb-4">
        <button onClick={startNew} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer">
          + 아이템 추가
        </button>
      </div>

      {/* 아이템 폼 */}
      {(showNew || editing) && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4">
          <h3 className="font-medium mb-4">{editing ? '아이템 수정' : '새 아이템'}</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">카테고리 코드 *</label>
              <input value={form.item_category} onChange={e => setForm(f => ({ ...f, item_category: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="item_frame" />
              {categories.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-1">
                  {categories.map(c => (
                    <button key={c} onClick={() => setForm(f => ({ ...f, item_category: c, item_category_name: itemsList.find(i => i.item_category === c)?.item_category_name || c }))}
                      className="text-[10px] text-blue-600 hover:underline cursor-pointer">{c}</button>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">카테고리명</label>
              <input value={form.item_category_name} onChange={e => setForm(f => ({ ...f, item_category_name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="액자" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">코드 *</label>
              <input value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="FR-6x8" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">이름 *</label>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="6x8 액자" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">가격 단위</label>
              <select value={form.price_unit_type} onChange={e => setForm(f => ({ ...f, price_unit_type: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <option value="person">인원(person)</option>
                <option value="qty">수량(qty)</option>
                <option value="fixed">고정(fixed)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">기본단위</label>
              <input type="number" value={form.base_unit} onChange={e => setForm(f => ({ ...f, base_unit: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">단위 라벨</label>
              <input value={form.unit_label} onChange={e => setForm(f => ({ ...f, unit_label: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" placeholder="인, 장, 개" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">기본가</label>
              <input type="number" value={form.base_price} onChange={e => setForm(f => ({ ...f, base_price: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">추가단위 단가</label>
              <input type="number" value={form.extra_unit_price} onChange={e => setForm(f => ({ ...f, extra_unit_price: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">정렬순서</label>
              <input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="item_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
              <label htmlFor="item_active" className="text-sm">활성</label>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 cursor-pointer">
              {saving ? '저장 중...' : '저장'}
            </button>
            <button onClick={() => { setEditing(null); setShowNew(false) }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer hover:bg-gray-50">
              취소
            </button>
          </div>
        </div>
      )}

      {/* 아이템 리스트 (카테고리별) */}
      {categories.map(cat => {
        const catItems = itemsList.filter(i => i.item_category === cat)
        const catName = catItems[0]?.item_category_name || cat

        return (
          <div key={cat} className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">{catName} ({cat})</h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-2 font-medium text-gray-600 w-12">순서</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">코드</th>
                    <th className="text-left px-4 py-2 font-medium text-gray-600">이름</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">단위</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">기본가</th>
                    <th className="text-right px-4 py-2 font-medium text-gray-600">추가단가</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">옵션</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">상태</th>
                    <th className="text-center px-4 py-2 font-medium text-gray-600">관리</th>
                  </tr>
                </thead>
                <tbody>
                  {catItems.map(item => {
                    const itemOpts = optionsList.filter(o => o.item_id === item.id)
                    return (
                      <Fragment key={item.id}>
                        <tr className="border-b border-gray-100 last:border-b-0 hover:bg-gray-50">
                          <td className="px-4 py-2 text-gray-400">{item.sort_order}</td>
                          <td className="px-4 py-2 font-mono text-xs">{item.code}</td>
                          <td className="px-4 py-2 font-medium">{item.name}</td>
                          <td className="px-4 py-2 text-center text-xs text-gray-500">{item.price_unit_type} / {item.unit_label || '-'}</td>
                          <td className="px-4 py-2 text-right">{fmtPrice(item.base_price)}</td>
                          <td className="px-4 py-2 text-right text-gray-500">{fmtPrice(item.extra_unit_price || 0)}</td>
                          <td className="px-4 py-2 text-center">
                            {itemOpts.length > 0 ? (
                              <span className="text-xs text-purple-600">{itemOpts.length}개</span>
                            ) : (
                              <span className="text-xs text-gray-300">-</span>
                            )}
                          </td>
                          <td className="px-4 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded ${item.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {item.is_active ? '활성' : '비활성'}
                            </span>
                          </td>
                          <td className="px-4 py-2 text-center">
                            <div className="flex gap-2 justify-center">
                              <button onClick={() => startEdit(item)} className="text-blue-600 hover:underline text-xs cursor-pointer">수정</button>
                              <button onClick={() => openOptions(item.id)}
                                className="text-purple-600 hover:underline text-xs cursor-pointer">
                                옵션 {expandedItem === item.id ? '▲' : '▼'}
                              </button>
                            </div>
                          </td>
                        </tr>
                        {/* 옵션 확장 영역 */}
                        {expandedItem === item.id && (
                          <tr key={`${item.id}_opts`}>
                            <td colSpan={9} className="bg-gray-50 px-6 py-4">
                              <div className="text-xs font-semibold text-gray-600 mb-3">옵션 (색상/사이즈 등)</div>
                              <div className="space-y-2">
                                {optionLines.map((ol, idx) => (
                                  <div key={ol.id} className="flex items-center gap-2 bg-white rounded-lg p-2 border border-gray-200">
                                    <span className="text-xs text-gray-400 w-6">{idx + 1}</span>
                                    <input
                                      value={ol.option_name}
                                      onChange={e => updateOptionLine(idx, { option_name: e.target.value })}
                                      className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs"
                                      placeholder="옵션명"
                                    />
                                    <div className="flex items-center gap-1">
                                      <span className="text-xs text-gray-400">차액</span>
                                      <input type="number" value={ol.price_diff}
                                        onChange={e => updateOptionLine(idx, { price_diff: Number(e.target.value) || 0 })}
                                        className="w-16 px-1 py-1 border border-gray-200 rounded text-xs text-center" />
                                    </div>
                                    <label className="flex items-center gap-1 text-xs">
                                      <input type="checkbox" checked={ol.is_default}
                                        onChange={e => updateOptionLine(idx, { is_default: e.target.checked })} />
                                      기본
                                    </label>
                                    <label className="flex items-center gap-1 text-xs">
                                      <input type="checkbox" checked={ol.is_active}
                                        onChange={e => updateOptionLine(idx, { is_active: e.target.checked })} />
                                      활성
                                    </label>
                                    <button onClick={() => deleteOptionLine(idx)}
                                      className="text-gray-400 hover:text-red-500 text-xs cursor-pointer">✕</button>
                                  </div>
                                ))}
                              </div>
                              <div className="flex gap-2 mt-3">
                                <button onClick={() => addOptionLine(item.id)}
                                  className="px-3 py-1.5 text-xs border border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-gray-400 cursor-pointer">
                                  + 옵션 추가
                                </button>
                                <button onClick={() => saveOptions(item.id)}
                                  className="px-3 py-1.5 text-xs bg-gray-900 text-white rounded-lg cursor-pointer hover:bg-gray-800">
                                  옵션 저장
                                </button>
                                <button onClick={() => { setExpandedItem(null); setEditingOptions(false) }}
                                  className="px-3 py-1.5 text-xs border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
                                  닫기
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })}

      {itemsList.length === 0 && (
        <div className="text-center text-gray-400 py-12 text-sm bg-white rounded-2xl border border-gray-200">
          등록된 아이템이 없습니다
        </div>
      )}
    </div>
  )
}