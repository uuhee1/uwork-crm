'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import { useRouter } from 'next/navigation'

type TodoItem = {
  id: string
  source_type: 'consultation' | 'work_process'
  source_id: string
  customer_id: string | null
  schedule_id: string | null
  sale_id: string | null
  assigned_staff_id: string | null
  title: string | null
  detail: string | null
  is_done: boolean
  phase: string | null         // 'consultation', 'photo', 'order', 'delivery'
  process_code: string | null
  process_name: string | null
  work_status: string | null
  link_type: string | null
  tags: string[] | null
  created_at: string
  updated_at: string
  // joined
  customer_name?: string
  staff_name?: string
  assigned_name?: string
  shoot_date?: string
  shoot_type?: string
  package_name?: string
}

type FilterMode = 'mine' | 'all'
type StatusFilter = 'pending' | 'done' | 'both'
type PhaseFilter = 'all' | 'photo' | 'order' | 'delivery' | 'consultation'

const WORK_STATUS_LABEL: Record<string, string> = {
  pending: '해야함',
  done: '완료',
  none: '없음',
  compositing: '합성중',
  composite_done: '합성완료',
  waiting_reply: '답변기다림',
  in_progress: '작업중',
  pickup_ready: '방문수령',
  shipping_ready: '택배준비',
}

const PHASE_LABEL: Record<string, string> = {
  photo: '사진작업',
  order: '주문',
  delivery: '포장/택배',
  consultation: '상담',
}

const PHASE_COLOR: Record<string, string> = {
  photo: 'bg-purple-50 text-purple-800',
  order: 'bg-amber-50 text-amber-800',
  delivery: 'bg-teal-50 text-teal-800',
  consultation: 'bg-gray-100 text-gray-600',
}

export default function TodoPage() {
  const router = useRouter()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentStaffId, setCurrentStaffId] = useState('')
  const [currentStaffName, setCurrentStaffName] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('mine')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [phaseFilter, setPhaseFilter] = useState<PhaseFilter>('all')
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')

  useEffect(() => {
    loadInit()
  }, [])

  useEffect(() => {
    if (currentStaffId) loadTodos()
  }, [filterMode, statusFilter, phaseFilter, selectedStaffId, currentStaffId])

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: staff } = await supabase
      .from('staff')
      .select('id, name')
      .eq('auth_user_id', user.id)
      .single()

    if (staff) {
      setCurrentStaffId(staff.id)
      setCurrentStaffName(staff.name)
      setSelectedStaffId(staff.id)
    }

    const { data: allStaff } = await supabase
      .from('staff')
      .select('id, name')
      .eq('is_active', true)

    if (allStaff) setStaffList(allStaff)
  }

  async function loadTodos() {
    setLoading(true)

    // todos_unified 뷰는 JOIN이 없으므로 별도로 고객/스케줄/판매 정보를 붙여야 함
    // 두 소스를 각각 조회해서 합침

    const items: TodoItem[] = []

    // ① 상담 할일
    if (phaseFilter === 'all' || phaseFilter === 'consultation') {
      let cQuery = supabase
        .from('consultations')
        .select(`
          id, customer_id, schedule_id, sale_id,
          todo_assigned_id, todo_note, content, todo_done, has_todo,
          link_type, tags, created_at,
          customers:customer_id ( name ),
          staff:staff_id ( name ),
          todo_assigned:todo_assigned_id ( name ),
          schedules:schedule_id ( shoot_date, shoot_types:shoot_type_id ( label ) )
        `)
        .eq('has_todo', true)
        .order('created_at', { ascending: false })

      if (statusFilter === 'pending') cQuery = cQuery.eq('todo_done', false)
      else if (statusFilter === 'done') cQuery = cQuery.eq('todo_done', true)

      if (filterMode === 'mine') {
        cQuery = cQuery.eq('todo_assigned_id', currentStaffId)
      } else if (selectedStaffId && selectedStaffId !== 'all') {
        cQuery = cQuery.eq('todo_assigned_id', selectedStaffId)
      }

      const { data: cData } = await cQuery.limit(200)
      if (cData) {
        for (const c of cData as any[]) {
          items.push({
            id: c.id,
            source_type: 'consultation',
            source_id: c.id,
            customer_id: c.customer_id,
            schedule_id: c.schedule_id,
            sale_id: c.sale_id,
            assigned_staff_id: c.todo_assigned_id,
            title: c.todo_note,
            detail: c.content,
            is_done: c.todo_done,
            phase: 'consultation',
            process_code: null,
            process_name: null,
            work_status: null,
            link_type: c.link_type,
            tags: c.tags,
            created_at: c.created_at,
            updated_at: c.created_at,
            customer_name: c.customers?.name || '-',
            assigned_name: c.todo_assigned?.name || null,
            staff_name: c.staff?.name || null,
            shoot_date: c.schedules?.shoot_date || null,
            shoot_type: c.schedules?.shoot_types?.label || null,
          })
        }
      }
    }

    // ② 작업 할일
    if (phaseFilter !== 'consultation') {
      let wQuery = supabase
        .from('sale_work_status')
        .select(`
          id, sale_id, process_id, status, memo, assigned_staff_id, created_at, updated_at,
          assigned_staff:assigned_staff_id ( name ),
          work_processes!inner ( code, name, phase ),
          sales!inner (
            customer_id, package_name, schedule_id, sale_status,
            customers ( name ),
            schedules ( shoot_date, shoot_types:shoot_type_id ( label ) )
          )
        `)

      // 상태 필터: pending = 미완료인 것만
      if (statusFilter === 'pending') {
        // done, none, none_file_only 제외
        wQuery = wQuery.not('status', 'in', '(done,none,none_file_only)')
      } else if (statusFilter === 'done') {
        wQuery = wQuery.in('status', ['done', 'none', 'none_file_only'])
      }

      // phase 필터
      if (phaseFilter !== 'all') {
        wQuery = wQuery.eq('work_processes.phase', phaseFilter)
      }

      // 담당자 필터 — "내 할일"일 때도 미지정(null) 건은 포함
      if (filterMode === 'mine') {
        wQuery = wQuery.or(`assigned_staff_id.eq.${currentStaffId},assigned_staff_id.is.null`)
      } else if (selectedStaffId && selectedStaffId !== 'all') {
        wQuery = wQuery.or(`assigned_staff_id.eq.${selectedStaffId},assigned_staff_id.is.null`)
      }

      const { data: wData } = await wQuery.order('created_at', { ascending: false }).limit(300)
      if (wData) {
        for (const w of wData as any[]) {
          const wp = w.work_processes
          const s = w.sales
          items.push({
            id: w.id,
            source_type: 'work_process',
            source_id: w.id,
            customer_id: s?.customer_id || null,
            schedule_id: s?.schedule_id || null,
            sale_id: w.sale_id,
            assigned_staff_id: w.assigned_staff_id,
            title: wp?.name || '-',
            detail: w.memo,
            is_done: ['done', 'none', 'none_file_only'].includes(w.status),
            phase: wp?.phase || null,
            process_code: wp?.code || null,
            process_name: wp?.name || null,
            work_status: w.status,
            link_type: null,
            tags: null,
            created_at: w.created_at,
            updated_at: w.updated_at,
            customer_name: s?.customers?.name || '-',
            assigned_name: w.assigned_staff?.name || null,
            shoot_date: s?.schedules?.shoot_date || null,
            shoot_type: s?.schedules?.shoot_types?.label || null,
            package_name: s?.package_name || null,
          })
        }
      }
    }

    // 정렬: 미완료 먼저, 그 안에서 날짜 최신순
    items.sort((a, b) => {
      if (a.is_done !== b.is_done) return a.is_done ? 1 : -1
      return b.created_at.localeCompare(a.created_at)
    })

    setTodos(items)
    setLoading(false)
  }

  // 상담 할일 완료 토글
  async function toggleConsultationDone(todo: TodoItem) {
    const newDone = !todo.is_done
    const { error } = await supabase
      .from('consultations')
      .update({ todo_done: newDone })
      .eq('id', todo.source_id)

    if (!error) {
      setTodos(prev => prev.map(t =>
        t.id === todo.id ? { ...t, is_done: newDone } : t
      ))
    }
  }

  // 작업 할일 완료 토글
  async function toggleWorkDone(todo: TodoItem) {
    const newStatus = todo.is_done ? 'pending' : 'done'
    const { error } = await supabase
      .from('sale_work_status')
      .update({ status: newStatus })
      .eq('id', todo.source_id)

    if (!error) {
      setTodos(prev => prev.map(t =>
        t.id === todo.id ? { ...t, is_done: !todo.is_done, work_status: newStatus } : t
      ))
    }
  }

  function handleToggle(todo: TodoItem) {
    if (todo.source_type === 'consultation') toggleConsultationDone(todo)
    else toggleWorkDone(todo)
  }

  function goToCustomer(customerId: string | null) {
    if (customerId) router.push(`/search?customer_id=${customerId}`)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  }

  function getLinkTypeLabel(lt: string | null) {
    if (lt === 'new_shoot') return '새촬영예정'
    if (lt === 'etc_inquiry') return '기타문의'
    return ''
  }

  const pendingCount = todos.filter(t => !t.is_done).length
  const doneCount = todos.filter(t => t.is_done).length

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto p-6">
        {/* 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">할일</h2>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-red-600 font-medium">미완료 {pendingCount}</span>
            <span className="text-gray-400">|</span>
            <span className="text-green-600">완료 {doneCount}</span>
          </div>
        </div>

        {/* 필터 */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            {/* 담당자 필터 */}
            <div className="flex gap-2">
              <button
                onClick={() => { setFilterMode('mine'); setSelectedStaffId(currentStaffId) }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  filterMode === 'mine' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                내 할일
              </button>
              <button
                onClick={() => { setFilterMode('all'); setSelectedStaffId('all') }}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                  filterMode === 'all' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
            </div>

            {filterMode === 'all' && (
              <select
                value={selectedStaffId}
                onChange={e => setSelectedStaffId(e.target.value)}
                className="px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
              >
                <option value="all">전체 직원</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            )}

            <div className="w-px h-6 bg-gray-200" />

            {/* 상태 필터 */}
            <div className="flex gap-2">
              {([
                { value: 'pending' as StatusFilter, label: '해야함' },
                { value: 'done' as StatusFilter, label: '완료' },
                { value: 'both' as StatusFilter, label: '전체' },
              ]).map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    statusFilter === f.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-gray-200" />

            {/* Phase 필터 */}
            <div className="flex gap-2">
              {([
                { value: 'all' as PhaseFilter, label: '전체' },
                { value: 'photo' as PhaseFilter, label: '사진작업' },
                { value: 'order' as PhaseFilter, label: '주문' },
                { value: 'delivery' as PhaseFilter, label: '포장/택배' },
                { value: 'consultation' as PhaseFilter, label: '상담' },
              ]).map(f => (
                <button
                  key={f.value}
                  onClick={() => setPhaseFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    phaseFilter === f.value ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 할일 목록 */}
        {loading ? (
          <div className="text-center text-gray-400 py-12 text-sm">로딩 중...</div>
        ) : todos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">
            {statusFilter === 'pending' ? '해야 할 일이 없습니다' : '해당하는 할일이 없습니다'}
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map(todo => (
              <div
                key={`${todo.source_type}_${todo.id}`}
                className={`bg-white rounded-xl border p-4 transition ${
                  todo.is_done ? 'border-gray-100 opacity-60' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 체크박스 */}
                  <button
                    onClick={() => handleToggle(todo)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition ${
                      todo.is_done
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {todo.is_done && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    {/* 상단: 고객명 + phase 뱃지 + 날짜 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => goToCustomer(todo.customer_id)}
                        className="text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        {todo.customer_name || '-'}
                      </button>

                      {/* Phase 뱃지 */}
                      {todo.phase && (
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${PHASE_COLOR[todo.phase] || 'bg-gray-100 text-gray-600'}`}>
                          {PHASE_LABEL[todo.phase] || todo.phase}
                        </span>
                      )}

                      {/* 촬영 정보 */}
                      {todo.shoot_type && (
                        <span className="text-xs text-gray-500">
                          {todo.shoot_type}{todo.shoot_date ? ` · ${todo.shoot_date}` : ''}
                        </span>
                      )}

                      {/* 상담 링크타입 */}
                      {todo.source_type === 'consultation' && todo.link_type && todo.link_type !== 'linked' && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                          {getLinkTypeLabel(todo.link_type)}
                        </span>
                      )}

                      {/* 날짜 (상담만) */}
                      {todo.source_type === 'consultation' && (
                        <span className="text-xs text-gray-400">{formatDate(todo.created_at)}</span>
                      )}
                    </div>

                    {/* 할일 제목 */}
                    {todo.source_type === 'work_process' ? (
                      <p className={`text-sm mt-1 font-medium ${todo.is_done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {todo.process_name} — {WORK_STATUS_LABEL[todo.work_status || ''] || todo.work_status}
                      </p>
                    ) : (
                      todo.title && (
                        <p className={`text-sm mt-1 font-medium ${todo.is_done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {todo.title}
                        </p>
                      )
                    )}

                    {/* 상세 내용 */}
                    {todo.detail && todo.detail !== '(할일 등록)' && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{todo.detail}</p>
                    )}

                    {/* 태그 (상담) */}
                    {todo.tags && todo.tags.length > 0 && (
                      <div className="flex gap-1 mt-1.5 flex-wrap">
                        {todo.tags.map(tag => (
                          <span key={tag} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-500">{tag}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 담당자 */}
                  <div className="shrink-0 text-right">
                    {todo.assigned_name && (
                      <span className="text-xs text-gray-500">{todo.assigned_name}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  )
}