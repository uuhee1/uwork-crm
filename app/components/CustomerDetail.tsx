'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import ScheduleForm from './ScheduleForm'
import ConsultationForm from './ConsultationForm'

type Customer = {
  id: string
  name: string
  phone: string | null
  phone_last4: string | null
  group_name: string
  memo: string | null
  created_at: string
}

type ScheduleRow = {
  id: string
  shoot_date: string
  start_at: string
  end_at: string
  people_count: number
  status: string
  deposit_status: string
  memo: string | null
  shoot_types: { label: string; cal_color: string | null } | null
  staff: { name: string } | null
}

type ConsultationRow = {
  id: string
  schedule_id: string | null
  link_type: string
  content: string
  tags: string[] | null
  has_todo: boolean
  todo_done: boolean
  todo_note: string | null
  todo_assigned_id: string | null
  staff: { name: string } | null
  todo_assigned: { name: string } | null
  created_at: string
}

type SaleRow = {
  id: string
  schedule_id: string | null
  package_name: string | null
  total_amount: number
  discount: number
  deposit_deduct: number
  sale_status: string
  payment_status: string
  created_at: string
}

type Props = {
  customer: Customer
  schedules: ScheduleRow[]
  getStatusLabel: (s: string) => string
  getStatusColor: (s: string) => string
  getDepositLabel: (s: string) => string
  onCustomerUpdated: (c: Customer) => void
  onScheduleAdded: () => void
}

const SALE_STATUS_LABEL: Record<string, string> = {
  draft: '작성중', confirmed: '확정', canceled: '취소',
}
const PAYMENT_STATUS_LABEL: Record<string, string> = {
  pending: '미결제', partial: '일부결제', paid: '결제완료', refunded: '환불',
}
const PAYMENT_STATUS_COLOR: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  partial: 'bg-yellow-100 text-yellow-800',
  paid: 'bg-green-100 text-green-800',
  refunded: 'bg-red-100 text-red-700',
}

const fmtPrice = (n: number) => new Intl.NumberFormat('ko-KR').format(n)

export default function CustomerDetail({
  customer, schedules, getStatusLabel, getStatusColor, getDepositLabel, onCustomerUpdated, onScheduleAdded,
}: Props) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(customer.name)
  const [editPhone, setEditPhone] = useState(customer.phone || '')
  const [editGroup, setEditGroup] = useState(customer.group_name)
  const [editMemo, setEditMemo] = useState(customer.memo || '')
  const [saving, setSaving] = useState(false)
  const [viewMode, setViewMode] = useState<'timeline' | 'schedule'>('timeline')
  const [showScheduleForm, setShowScheduleForm] = useState(false)
  const [consultFormMode, setConsultFormMode] = useState<'consultation' | 'todo' | null>(null)
  const [consultations, setConsultations] = useState<ConsultationRow[]>([])
  const [sales, setSales] = useState<SaleRow[]>([])

  useEffect(() => { loadConsultations(); loadSales() }, [customer.id])

  async function loadConsultations() {
    const { data } = await supabase
      .from('consultations')
      .select('*, staff:staff_id ( name ), todo_assigned:todo_assigned_id ( name )')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    setConsultations(data || [])
  }

  async function loadSales() {
    const { data } = await supabase
      .from('sales')
      .select('id, schedule_id, package_name, total_amount, discount, deposit_deduct, sale_status, payment_status, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
    setSales(data || [])
  }

  async function toggleTodoDone(consultId: string, currentDone: boolean) {
    await supabase.from('consultations').update({ todo_done: !currentDone }).eq('id', consultId)
    loadConsultations()
  }

  function startEdit() {
    setEditName(customer.name)
    setEditPhone(customer.phone || '')
    setEditGroup(customer.group_name)
    setEditMemo(customer.memo || '')
    setEditing(true)
  }

  async function saveEdit() {
    setSaving(true)
    const phoneDigits = editPhone.replace(/[^0-9]/g, '')
    const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : phoneDigits || null
    const { data, error } = await supabase
      .from('customers')
      .update({ name: editName.trim(), phone: phoneDigits || null, phone_last4: last4, group_name: editGroup, memo: editMemo.trim() || null })
      .eq('id', customer.id).select('*').single()
    if (error) alert('수정 실패: ' + error.message)
    else if (data) { onCustomerUpdated(data); setEditing(false) }
    setSaving(false)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  function getLinkTypeLabel(lt: string) {
    if (lt === 'new_shoot') return '새촬영예정'
    if (lt === 'etc_inquiry') return '기타문의'
    return ''
  }

  function getConsultsBySchedule(sid: string) { return consultations.filter(c => c.schedule_id === sid) }
  function getSalesBySchedule(sid: string) { return sales.filter(s => s.schedule_id === sid) }
  function getUnlinkedConsults() { return consultations.filter(c => !c.schedule_id) }
  function getUnlinkedSales() { return sales.filter(s => !s.schedule_id) }

  const scheduleOptions = schedules.map(s => ({
    id: s.id,
    label: `${s.shoot_types?.label || '-'} ${s.shoot_date} (${getStatusLabel(s.status)})`,
  }))

  function openConsultForm(m: 'consultation' | 'todo') { setConsultFormMode(m); setShowScheduleForm(false) }
  function openScheduleForm() { setShowScheduleForm(true); setConsultFormMode(null) }

  function renderTodoButton(c: ConsultationRow, showAssigned: boolean) {
    if (!c.has_todo) return null
    return (
      <button
        onClick={async (e) => {
          e.stopPropagation()
          e.preventDefault()
          const newDone = !c.todo_done
          const { error } = await supabase
            .from('consultations')
            .update({ todo_done: newDone })
            .eq('id', c.id)
          if (error) {
            console.error('할일 업데이트 실패:', error)
            alert('할일 업데이트 실패: ' + error.message)
          } else {
            loadConsultations()
          }
        }}
        className={`shrink-0 ml-2 px-2 py-1 rounded text-xs font-medium cursor-pointer transition ${
          c.todo_done ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'
        }`}
      >
        {c.todo_done ? '✓ 완료' : '⬚ 할일'}
        {showAssigned && c.todo_assigned?.name ? ` (${c.todo_assigned.name})` : ''}
      </button>
    )
  }

  // 판매 카드 렌더러
  function renderSaleCard(s: SaleRow) {
    return (
      <div key={`sale-${s.id}`} className="bg-white rounded-xl border border-purple-200 p-3">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs">💰</span>
              <span className="text-sm font-medium">{s.package_name || '(단품 판매)'}</span>
              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLOR[s.payment_status] || 'bg-gray-100'}`}>
                {PAYMENT_STATUS_LABEL[s.payment_status] || s.payment_status}
              </span>
              {s.sale_status === 'draft' && (
                <span className="px-1.5 py-0.5 rounded text-xs bg-gray-200 text-gray-600">
                  {SALE_STATUS_LABEL[s.sale_status]}
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 mt-1 ml-5 flex items-center gap-3">
              <span>총액 {fmtPrice(s.total_amount)}원</span>
              {s.discount > 0 && <span className="text-orange-600">할인 -{fmtPrice(s.discount)}</span>}
              {s.deposit_deduct > 0 && <span className="text-blue-600">예약금 -{fmtPrice(s.deposit_deduct)}</span>}
            </div>
          </div>
          <span className="text-xs text-gray-400">{formatDate(s.created_at)}</span>
        </div>
      </div>
    )
  }

  type TimelineItem =
    | { type: 'schedule'; data: ScheduleRow; date: string }
    | { type: 'consultation'; data: ConsultationRow; date: string }
    | { type: 'sale'; data: SaleRow; date: string }

  function getTimelineItems(): TimelineItem[] {
    const items: TimelineItem[] = []
    schedules.forEach(s => {
      const sortDate = `${s.shoot_date}T${s.start_at || '00:00'}`
      items.push({ type: 'schedule', data: s, date: sortDate })
    })
    consultations.forEach(c => {
      if (c.schedule_id) {
        const linked = schedules.find(s => s.id === c.schedule_id)
        if (linked) {
          items.push({ type: 'consultation', data: c, date: `${linked.shoot_date}T${linked.start_at || '00:00'}` })
        } else {
          items.push({ type: 'consultation', data: c, date: c.created_at })
        }
      } else {
        items.push({ type: 'consultation', data: c, date: c.created_at })
      }
    })
    sales.forEach(s => {
      if (s.schedule_id) {
        const linked = schedules.find(sc => sc.id === s.schedule_id)
        if (linked) {
          items.push({ type: 'sale', data: s, date: `${linked.shoot_date}T99:99` }) // 스케줄 뒤에
        } else {
          items.push({ type: 'sale', data: s, date: s.created_at })
        }
      } else {
        items.push({ type: 'sale', data: s, date: s.created_at })
      }
    })
    items.sort((a, b) => b.date.localeCompare(a.date))
    return items
  }

  return (
    <div className="space-y-4">
      {/* 고객 기본정보 */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-lg font-bold">{customer.name}</h3>
            <p className="text-sm text-gray-500">{customer.phone || '전화번호 없음'} · {customer.group_name}</p>
          </div>
          <button onClick={editing ? () => setEditing(false) : startEdit} className="text-xs text-gray-400 hover:text-gray-700 cursor-pointer">
            {editing ? '취소' : '수정'}
          </button>
        </div>
        {customer.memo && !editing && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{customer.memo}</p>}
        {editing && (
          <div className="space-y-2 mt-3">
            <input value={editName} onChange={e => setEditName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="이름" />
            <input value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="전화번호" />
            <select value={editGroup} onChange={e => setEditGroup(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm">
              <option value="유유히">유유히</option><option value="모디온">모디온</option><option value="웨이블루">웨이블루</option>
            </select>
            <textarea value={editMemo} onChange={e => setEditMemo(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none" rows={2} placeholder="메모" />
            <div className="flex gap-2">
              <button onClick={saveEdit} disabled={saving} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm cursor-pointer">{saving ? '저장 중...' : '저장'}</button>
              <button onClick={() => setEditing(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm cursor-pointer">취소</button>
            </div>
          </div>
        )}
      </div>

      {/* 뷰 전환 + 등록 버튼 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          <button onClick={() => setViewMode('timeline')} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${viewMode === 'timeline' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>타임라인</button>
          <button onClick={() => setViewMode('schedule')} className={`px-4 py-2 rounded-lg text-sm font-medium cursor-pointer ${viewMode === 'schedule' ? 'bg-gray-900 text-white' : 'bg-white border border-gray-300 hover:bg-gray-50'}`}>스케줄별</button>
        </div>
        <div className="flex gap-2">
          <button onClick={() => openConsultForm('consultation')} className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer">+ 상담/할일</button>
          <button onClick={openScheduleForm} className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer">+ 스케줄</button>
          <button
            onClick={() => window.location.href = `/sales/new?customer_id=${customer.id}`}
            className="px-3 py-1.5 text-xs bg-purple-600 text-white rounded-lg hover:bg-purple-700 cursor-pointer"
          >
            + 판매
          </button>
        </div>
      </div>

      {/* 상담/할일 등록 폼 */}
      {consultFormMode && (
        <ConsultationForm
          customerId={customer.id}
          schedules={scheduleOptions}
          mode={consultFormMode}
          onSaved={() => { setConsultFormMode(null); loadConsultations() }}
          onCancel={() => setConsultFormMode(null)}
        />
      )}

      {/* 스케줄 등록 폼 */}
      {showScheduleForm && (
        <ScheduleForm
          customerId={customer.id}
          onSaved={() => { setShowScheduleForm(false); onScheduleAdded() }}
          onCancel={() => setShowScheduleForm(false)}
        />
      )}

      {/* 타임라인 뷰 */}
      {viewMode === 'timeline' && (
        <div className="space-y-2">
          {(() => {
            const items = getTimelineItems()
            if (items.length === 0) return <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 text-center text-gray-400 text-sm">이력이 없습니다</div>
            return items.map((item) => {
              if (item.type === 'schedule') {
                const s = item.data
                return (
                  <div key={`s-${s.id}`} className="bg-white rounded-xl border border-gray-200 p-3 flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs">📅</span>
                        <span className="text-sm font-medium">{s.shoot_date}</span>
                        <span className="text-sm text-gray-600">{s.shoot_types?.label} {s.people_count}인</span>
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5 ml-5">{s.start_at?.slice(0,5)} ~ {s.end_at?.slice(0,5)}{s.staff?.name ? ` | ${s.staff.name}` : ''}</div>
                      {s.memo && <p className="text-xs text-gray-500 mt-1 ml-5">{s.memo}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(s.status)}`}>{getStatusLabel(s.status)}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{getDepositLabel(s.deposit_status)}</span>
                    </div>
                  </div>
                )
              } else if (item.type === 'sale') {
                return renderSaleCard(item.data)
              } else {
                const c = item.data
                return (
                  <div key={`c-${c.id}`} className="bg-white rounded-xl border border-gray-200 p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs">{c.has_todo ? '📌' : '📞'}</span>
                          <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                          {c.link_type !== 'linked' && <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700">{getLinkTypeLabel(c.link_type)}</span>}
                          {c.staff?.name && <span className="text-xs text-gray-400">{c.staff.name}</span>}
                        </div>
                        <p className="text-sm text-gray-700 mt-1 ml-5">{c.content}</p>
                        {c.tags && c.tags.length > 0 && (
                          <div className="flex gap-1 mt-1 ml-5 flex-wrap">
                            {c.tags.map(tag => <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{tag}</span>)}
                          </div>
                        )}
                        {c.has_todo && c.todo_note && <p className="text-xs mt-1 ml-5 text-gray-600">📌 {c.todo_note}</p>}
                      </div>
                      {renderTodoButton(c, true)}
                    </div>
                  </div>
                )
              }
            })
          })()}
        </div>
      )}

      {/* 스케줄별 뷰 */}
      {viewMode === 'schedule' && (
        <div className="space-y-4">
          {schedules.map(s => {
            const relatedConsults = getConsultsBySchedule(s.id)
            const relatedSales = getSalesBySchedule(s.id)
            return (
              <div key={s.id} className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-bold">{s.shoot_types?.label} {s.people_count}인 — {s.shoot_date}</span>
                    <div className="flex gap-1.5">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(s.status)}`}>{getStatusLabel(s.status)}</span>
                      <span className="px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">{getDepositLabel(s.deposit_status)}</span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{s.start_at?.slice(0,5)} ~ {s.end_at?.slice(0,5)}{s.staff?.name ? ` | ${s.staff.name}` : ''}</div>
                  {s.memo && <p className="text-xs text-gray-500 mt-1">{s.memo}</p>}
                </div>

                <div className="px-4 py-3 space-y-3">
                  {/* 판매 내역 */}
                  {relatedSales.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1.5">판매</div>
                      {relatedSales.map(sl => (
                        <div key={sl.id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-b-0">
                          <div>
                            <span className="text-sm font-medium">{sl.package_name || '(단품)'}</span>
                            <span className="text-xs text-gray-500 ml-2">{fmtPrice(sl.total_amount)}원</span>
                            {sl.discount > 0 && <span className="text-xs text-orange-600 ml-1">할인 -{fmtPrice(sl.discount)}</span>}
                          </div>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLOR[sl.payment_status] || 'bg-gray-100'}`}>
                            {PAYMENT_STATUS_LABEL[sl.payment_status] || sl.payment_status}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 상담 */}
                  {relatedConsults.length > 0 && (
                    <div>
                      <div className="text-xs font-semibold text-gray-500 mb-1.5">상담</div>
                      {relatedConsults.map(c => (
                        <div key={c.id} className="flex items-start justify-between py-1">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                              {c.staff?.name && <span className="text-xs text-gray-400">{c.staff.name}</span>}
                            </div>
                            <p className="text-sm text-gray-700">{c.content}</p>
                            {c.tags && c.tags.length > 0 && (
                              <div className="flex gap-1 mt-0.5 flex-wrap">{c.tags.map(tag => <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">{tag}</span>)}</div>
                            )}
                            {c.has_todo && c.todo_note && <p className="text-xs text-gray-500 mt-0.5">📌 {c.todo_note}</p>}
                          </div>
                          {renderTodoButton(c, false)}
                        </div>
                      ))}
                    </div>
                  )}

                  {relatedConsults.length === 0 && relatedSales.length === 0 && (
                    <p className="text-xs text-gray-300">연결된 상담/판매 없음</p>
                  )}
                </div>
              </div>
            )
          })}

          {/* 미귀속 판매 */}
          {getUnlinkedSales().length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-purple-200 overflow-hidden">
              <div className="bg-purple-50 px-4 py-3 border-b border-purple-200">
                <span className="text-sm font-bold text-purple-800">미귀속 판매</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {getUnlinkedSales().map(sl => (
                  <div key={sl.id} className="flex items-center justify-between py-1.5">
                    <div>
                      <span className="text-sm font-medium">{sl.package_name || '(단품)'}</span>
                      <span className="text-xs text-gray-500 ml-2">{fmtPrice(sl.total_amount)}원</span>
                      <span className="text-xs text-gray-400 ml-2">{formatDate(sl.created_at)}</span>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${PAYMENT_STATUS_COLOR[sl.payment_status] || 'bg-gray-100'}`}>
                      {PAYMENT_STATUS_LABEL[sl.payment_status] || sl.payment_status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 미귀속 상담 */}
          {getUnlinkedConsults().length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-orange-200 overflow-hidden">
              <div className="bg-orange-50 px-4 py-3 border-b border-orange-200">
                <span className="text-sm font-bold text-orange-800">미귀속 상담</span>
              </div>
              <div className="px-4 py-3 space-y-2">
                {getUnlinkedConsults().map(c => (
                  <div key={c.id} className="flex items-start justify-between py-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{formatDate(c.created_at)}</span>
                        <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700">{getLinkTypeLabel(c.link_type)}</span>
                      </div>
                      <p className="text-sm text-gray-700">{c.content}</p>
                      {c.has_todo && c.todo_note && <p className="text-xs text-gray-500 mt-0.5">📌 {c.todo_note}</p>}
                    </div>
                    {renderTodoButton(c, false)}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}