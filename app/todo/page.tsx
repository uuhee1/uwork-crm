'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import { useRouter } from 'next/navigation'

type TodoItem = {
  id: string
  content: string
  todo_note: string | null
  todo_done: boolean
  has_todo: boolean
  link_type: string
  tags: string[] | null
  created_at: string
  customer_id: string
  schedule_id: string | null
  customers: { name: string; phone_last4: string | null } | null
  staff: { name: string } | null
  todo_assigned: { name: string } | null
  schedules: { shoot_date: string; shoot_types: { label: string } | null } | null
}

type FilterMode = 'mine' | 'all'
type StatusFilter = 'pending' | 'done' | 'both'

export default function TodoPage() {
  const router = useRouter()
  const [todos, setTodos] = useState<TodoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [currentStaffId, setCurrentStaffId] = useState('')
  const [currentStaffName, setCurrentStaffName] = useState('')
  const [filterMode, setFilterMode] = useState<FilterMode>('mine')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending')
  const [staffList, setStaffList] = useState<{ id: string; name: string }[]>([])
  const [selectedStaffId, setSelectedStaffId] = useState('')

  useEffect(() => {
    loadInit()
  }, [])

  useEffect(() => {
    if (currentStaffId) loadTodos()
  }, [filterMode, statusFilter, selectedStaffId, currentStaffId])

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

let query = supabase
      .from('consultations')
      .select(`
        *,
        customers:customer_id ( name, phone_last4 ),
        staff:staff_id ( name ),
        todo_assigned:todo_assigned_id ( name ),
        schedules:schedule_id ( shoot_date, shoot_types:shoot_type_id ( label ) )
      `)
      .eq('has_todo', true)
      .order('created_at', { ascending: false })

    if (statusFilter === 'pending') {
      query = query.eq('todo_done', false)
    } else if (statusFilter === 'done') {
      query = query.eq('todo_done', true)
    }

    if (filterMode === 'mine') {
      query = query.eq('todo_assigned_id', currentStaffId)
    } else if (selectedStaffId && selectedStaffId !== 'all') {
      query = query.eq('todo_assigned_id', selectedStaffId)
    }

    const { data } = await query.limit(200)
    setTodos(data || [])
    setLoading(false)
  }

  async function toggleDone(todo: TodoItem) {
    const newDone = !todo.todo_done

    const { error } = await supabase
      .from('consultations')
      .update({ todo_done: newDone })
      .eq('id', todo.id)

    if (!error) {
      setTodos(prev => prev.map(t =>
        t.id === todo.id ? { ...t, todo_done: newDone } : t
      ))
    }
  }

  function goToCustomer(customerId: string) {
    router.push(`/search?customer_id=${customerId}`)
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    const hh = String(d.getHours()).padStart(2, '0')
    const mi = String(d.getMinutes()).padStart(2, '0')
    return `${mm}-${dd} ${hh}:${mi}`
  }

  function getLinkTypeLabel(lt: string) {
    if (lt === 'new_shoot') return '새촬영예정'
    if (lt === 'etc_inquiry') return '기타문의'
    return ''
  }

  const pendingCount = todos.filter(t => !t.todo_done).length
  const doneCount = todos.filter(t => t.todo_done).length

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
                { value: 'pending' as StatusFilter, label: '미완료' },
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
          </div>
        </div>

        {/* 할일 목록 */}
        {loading ? (
          <div className="text-center text-gray-400 py-12 text-sm">로딩 중...</div>
        ) : todos.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center text-gray-400 text-sm">
            {statusFilter === 'pending' ? '미완료 할일이 없습니다 🎉' : '해당하는 할일이 없습니다'}
          </div>
        ) : (
          <div className="space-y-2">
            {todos.map(todo => (
              <div
                key={todo.id}
                className={`bg-white rounded-xl border p-4 transition ${
                  todo.todo_done ? 'border-gray-100 opacity-60' : 'border-gray-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* 체크박스 */}
                  <button
                    onClick={() => toggleDone(todo)}
                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 cursor-pointer transition ${
                      todo.todo_done
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {todo.todo_done && (
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>

                  {/* 내용 */}
                  <div className="flex-1 min-w-0">
                    {/* 상단: 고객명 + 날짜 */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <button
                        onClick={() => goToCustomer(todo.customer_id)}
                        className="text-sm font-medium text-blue-600 hover:underline cursor-pointer"
                      >
                        {todo.customers?.name || '-'}
                      </button>
                      <span className="text-xs text-gray-400">{formatDate(todo.created_at)}</span>
                      {todo.link_type !== 'linked' && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-orange-100 text-orange-700">
                          {getLinkTypeLabel(todo.link_type)}
                        </span>
                      )}
                      {todo.schedules && (
                        <span className="text-xs text-gray-500">
                          {todo.schedules.shoot_types?.label} {todo.schedules.shoot_date}
                        </span>
                      )}
                    </div>

                    {/* 할일 메모 */}
                    {todo.todo_note && (
                      <p className={`text-sm mt-1 font-medium ${todo.todo_done ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        📌 {todo.todo_note}
                      </p>
                    )}

                    {/* 상담 내용 */}
                    <p className="text-xs text-gray-500 mt-1 line-clamp-2">{todo.content}</p>

                    {/* 태그 */}
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
                    {todo.todo_assigned?.name && (
                      <span className="text-xs text-gray-500">{todo.todo_assigned.name}</span>
                    )}
                    {todo.staff?.name && todo.staff.name !== todo.todo_assigned?.name && (
                      <p className="text-xs text-gray-300">상담: {todo.staff.name}</p>
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