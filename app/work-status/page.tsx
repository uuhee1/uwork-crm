'use client'

import { Fragment, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import { useRouter } from 'next/navigation'

type WorkProcess = {
  id: string
  code: string
  name: string
  phase: string
  status_options: string[]
  sort_order: number
}

type SaleWork = {
  sale_id: string
  customer_name: string
  customer_id: string
  shoot_date: string | null
  shoot_type_code: string | null
  shoot_type_label: string | null
  people_count: number | null
  package_name: string | null
  staff_name: string | null
  sale_created_at: string
  statuses: Record<string, { id: string; status: string; assigned_staff_name: string | null; memo: string | null }>
}

type StaffOption = { id: string; name: string }
type PhaseTab = 'photo' | 'order' | 'done'

const STATUS_LABEL: Record<string, string> = {
  pending: '해야함',
  done: '완료',
  none: '없음',
  none_file_only: '파일만',
  compositing: '합성중',
  composite_done: '합성완료',
  waiting_reply: '답변기다림',
  in_progress: '작업중',
  pickup_ready: '방문수령',
  shipping_ready: '택배준비',
}

const STATUS_COLOR: Record<string, string> = {
  pending: 'bg-red-50 text-red-700 border-red-200',
  done: 'bg-green-50 text-green-700 border-green-200',
  none: 'bg-gray-50 text-gray-400 border-gray-200',
  none_file_only: 'bg-gray-50 text-gray-400 border-gray-200',
  compositing: 'bg-purple-50 text-purple-700 border-purple-200',
  composite_done: 'bg-purple-50 text-purple-700 border-purple-200',
  waiting_reply: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  pickup_ready: 'bg-blue-50 text-blue-700 border-blue-200',
  shipping_ready: 'bg-orange-50 text-orange-700 border-orange-200',
}

// 인원 표시 안 하는 촬영 종류
const NO_PEOPLE_SUFFIX = ['wedding', 'profile']

export default function WorkStatusPage() {
  const router = useRouter()
  const [processes, setProcesses] = useState<WorkProcess[]>([])
  const [saleWorks, setSaleWorks] = useState<SaleWork[]>([])
  const [staffList, setStaffList] = useState<StaffOption[]>([])
  const [currentStaffId, setCurrentStaffId] = useState('')
  const [loading, setLoading] = useState(true)
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null)

  // 필터
  const [phaseTab, setPhaseTab] = useState<PhaseTab>('photo')
  const [staffFilter, setStaffFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [doneMonths, setDoneMonths] = useState(6)

  useEffect(() => {
    loadInit()
  }, [])

  useEffect(() => {
    if (processes.length > 0) loadSaleWorks()
  }, [phaseTab, staffFilter, statusFilter, doneMonths, processes])

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staff } = await supabase.from('staff').select('id').eq('auth_user_id', user.id).single()
      if (staff) setCurrentStaffId(staff.id)
    }

    const { data: allStaff } = await supabase.from('staff').select('id, name').eq('is_active', true)
    if (allStaff) setStaffList(allStaff)

    const { data: procs } = await supabase
      .from('work_processes')
      .select('*')
      .eq('is_active', true)
      .order('sort_order')
    if (procs) {
      setProcesses(procs.map(p => ({
        ...p,
        status_options: typeof p.status_options === 'string' ? JSON.parse(p.status_options) : p.status_options,
      })))
    }

    setLoading(false)
  }

  async function loadSaleWorks() {
    setLoading(true)

    const { data: rawData } = await supabase
      .from('sale_work_status')
      .select(`
        id, sale_id, process_id, status, memo,
        assigned_staff:assigned_staff_id ( name ),
        work_processes!inner ( code, phase ),
        sales!inner (
          id, customer_id, schedule_id, package_name, staff_id, created_at, sale_status,
          customers ( name ),
          staff:staff_id ( name ),
          schedules ( shoot_date, people_count, shoot_types:shoot_type_id ( label, code ) )
        )
      `)

    if (!rawData) { setLoading(false); return }

    const saleMap = new Map<string, SaleWork>()

    for (const row of rawData as any[]) {
      const s = row.sales
      if (s.sale_status !== 'confirmed') continue
      const saleId = row.sale_id
      const processCode = row.work_processes?.code

      if (!saleMap.has(saleId)) {
        saleMap.set(saleId, {
          sale_id: saleId,
          customer_name: s.customers?.name || '-',
          customer_id: s.customer_id,
          shoot_date: s.schedules?.shoot_date || null,
          shoot_type_code: s.schedules?.shoot_types?.code || null,
          shoot_type_label: s.schedules?.shoot_types?.label || null,
          people_count: s.schedules?.people_count || null,
          package_name: s.package_name || null,
          staff_name: s.staff?.name || null,
          sale_created_at: s.created_at,
          statuses: {},
        })
      }

      const sw = saleMap.get(saleId)!
      if (processCode) {
        sw.statuses[processCode] = {
          id: row.id,
          status: row.status,
          assigned_staff_name: row.assigned_staff?.name || null,
          memo: row.memo || null,
        }
      }
    }

    let results = Array.from(saleMap.values())

    const DONE_STATUSES = ['done', 'none', 'none_file_only']

    if (phaseTab === 'photo') {
      const photoCodes = processes.filter(p => p.phase === 'photo').map(p => p.code)
      results = results.filter(sw =>
        photoCodes.some(code => {
          const st = sw.statuses[code]?.status
          return st && !DONE_STATUSES.includes(st)
        })
      )
    } else if (phaseTab === 'order') {
      const orderCodes = processes.filter(p => p.phase === 'order' || p.phase === 'delivery').map(p => p.code)
      results = results.filter(sw =>
        orderCodes.some(code => {
          const st = sw.statuses[code]?.status
          return st && !DONE_STATUSES.includes(st)
        })
      )
    } else if (phaseTab === 'done') {
      const cutoff = new Date()
      cutoff.setMonth(cutoff.getMonth() - doneMonths)
      results = results.filter(sw => {
        const allDone = processes.every(p => {
          const st = sw.statuses[p.code]?.status
          return !st || DONE_STATUSES.includes(st)
        })
        return allDone && new Date(sw.sale_created_at) >= cutoff
      })
    }

    if (staffFilter !== 'all') {
      results = results.filter(sw =>
        Object.values(sw.statuses).some(st =>
          st.assigned_staff_name === staffList.find(s => s.id === staffFilter)?.name
        ) || sw.staff_name === staffList.find(s => s.id === staffFilter)?.name
      )
    }

    if (statusFilter === 'pending') {
      results = results.filter(sw =>
        Object.values(sw.statuses).some(st => st.status === 'pending')
      )
    } else if (statusFilter === 'waiting') {
      results = results.filter(sw =>
        Object.values(sw.statuses).some(st => st.status === 'waiting_reply')
      )
    }

    results.sort((a, b) => {
      const da = a.shoot_date || a.sale_created_at
      const db = b.shoot_date || b.sale_created_at
      return da.localeCompare(db)
    })

    setSaleWorks(results)
    setLoading(false)
  }

  async function updateStatus(swsId: string, saleId: string, newStatus: string) {
    await supabase.from('sale_work_status').update({ status: newStatus }).eq('id', swsId)
    setSaleWorks(prev => prev.map(sw => {
      if (sw.sale_id !== saleId) return sw
      const updated = { ...sw, statuses: { ...sw.statuses } }
      for (const [code, st] of Object.entries(updated.statuses)) {
        if (st.id === swsId) {
          updated.statuses[code] = { ...st, status: newStatus }
        }
      }
      return updated
    }))
  }

  // ─── 경로 복사 ───────────────────────────────
  function buildFolderName(sw: SaleWork): string {
    if (!sw.shoot_date) return ''
    const mm = sw.shoot_date.slice(5, 7)
    const dd = sw.shoot_date.slice(8, 10)
    const label = sw.shoot_type_label || ''
    const code = sw.shoot_type_code || ''
    const name = sw.customer_name || ''

    // 인원 표시
    let peopleSuffix = ''
    if (!NO_PEOPLE_SUFFIX.includes(code)) {
      peopleSuffix = `${sw.people_count || 1}인`
    }

    return `${mm}${dd} ${label}${peopleSuffix}(${name})`
  }

  function buildBasePath(sw: SaleWork): string {
    if (!sw.shoot_date) return ''
    const yyyy = sw.shoot_date.slice(0, 4)
    const m = parseInt(sw.shoot_date.slice(5, 7), 10)
    return `\\\\192.168.0.6\\${yyyy}_uuhee\\${yyyy}년 ${m}월(uuhee)`
  }

  function getWorkPhase(sw: SaleWork): 'photo' | 'ordering' | 'order_done' | 'ship_done' | 'id_photo' | 'id_done' {
    const isIdPhoto = sw.shoot_type_code === 'id_photo'
    const DONE = ['done', 'none', 'none_file_only']

    if (isIdPhoto) {
      // 증명: 원본전송이 done이면 완료
      const origSend = sw.statuses['original_send']?.status
      if (origSend && DONE.includes(origSend)) return 'id_done'
      return 'id_photo'
    }

    // 일반: 현재 단계 판별
    const photoCodes = processes.filter(p => p.phase === 'photo').map(p => p.code)
    const orderCodes = processes.filter(p => p.phase === 'order').map(p => p.code)
    const packingStatus = sw.statuses['packing']?.status

    const photoDone = photoCodes.every(c => {
      const st = sw.statuses[c]?.status
      return !st || DONE.includes(st)
    })
    const orderDone = orderCodes.every(c => {
      const st = sw.statuses[c]?.status
      return !st || DONE.includes(st)
    })
    const packingDone = !packingStatus || DONE.includes(packingStatus)

    if (!photoDone) return 'photo'
    if (!orderDone) return 'ordering'
    if (!packingDone) return 'order_done'
    return 'ship_done'
  }

  function buildFullPath(sw: SaleWork): string {
    const base = buildBasePath(sw)
    const folder = buildFolderName(sw)
    const phase = getWorkPhase(sw)

    switch (phase) {
      case 'id_photo':
        return `${base}\\${folder}`
      case 'id_done':
        return `${base}\\[증명완료]\\${folder}`
      case 'photo':
        return `${base}\\${folder}`
      case 'ordering':
        return `${base}\\[주문할것]\\${folder}`
      case 'order_done':
        return `${base}\\[주문할것]\\[주문완료]\\${folder}`
      case 'ship_done':
        return `${base}\\[주문할것]\\[주문완료]\\[포장및발송완료]\\${folder}`
      default:
        return `${base}\\${folder}`
    }
  }

  async function copyPath(sw: SaleWork) {
    const path = buildFullPath(sw)
    try {
      await navigator.clipboard.writeText(path)
      setCopyFeedback(sw.sale_id)
      setTimeout(() => setCopyFeedback(null), 1500)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = path
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      setCopyFeedback(sw.sale_id)
      setTimeout(() => setCopyFeedback(null), 1500)
    }
  }

  const visibleProcesses = phaseTab === 'done'
    ? processes
    : phaseTab === 'photo'
      ? processes.filter(p => p.phase === 'photo')
      : processes.filter(p => p.phase === 'order' || p.phase === 'delivery')

  function daysFromShoot(shootDate: string | null): string {
    if (!shootDate) return '-'
    const diff = Math.floor((Date.now() - new Date(shootDate).getTime()) / 86400000)
    if (diff < 0) return `D${diff}`
    return `D+${diff}`
  }

  if (loading && processes.length === 0) {
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
      <div className="max-w-[1400px] mx-auto p-6">
        <h2 className="text-xl font-bold mb-4">작업현황</h2>

        {/* 탭 + 필터 */}
        <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {([
                { key: 'photo' as PhaseTab, label: '사진작업' },
                { key: 'order' as PhaseTab, label: '주문/택배' },
                { key: 'done' as PhaseTab, label: '완료' },
              ]).map(t => (
                <button
                  key={t.key}
                  onClick={() => setPhaseTab(t.key)}
                  className={`px-4 py-2 text-sm rounded-md cursor-pointer transition ${
                    phaseTab === t.key
                      ? 'bg-white text-gray-900 shadow-sm font-medium'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="w-px h-6 bg-gray-200" />

            <select
              value={staffFilter}
              onChange={e => setStaffFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="all">전체 담당</option>
              {staffList.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>

            <div className="flex gap-1">
              {[
                { value: 'all', label: '전체' },
                { value: 'pending', label: '해야함' },
                { value: 'waiting', label: '답변기다림' },
              ].map(f => (
                <button
                  key={f.value}
                  onClick={() => setStatusFilter(f.value)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer ${
                    statusFilter === f.value
                      ? 'bg-gray-900 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {phaseTab === 'done' && (
              <>
                <div className="w-px h-6 bg-gray-200" />
                <select
                  value={doneMonths}
                  onChange={e => setDoneMonths(Number(e.target.value))}
                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm"
                >
                  <option value={3}>최근 3개월</option>
                  <option value={6}>최근 6개월</option>
                  <option value={12}>최근 1년</option>
                </select>
              </>
            )}

            <div className="ml-auto text-sm text-gray-400">
              {loading ? '로딩 중...' : `${saleWorks.length}건`}
            </div>
          </div>
        </div>

        {/* 테이블 */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-center px-2 py-2.5 font-medium text-gray-600 w-10">📋</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 sticky left-0 bg-gray-50 z-10 min-w-[60px]">촬영일</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[80px]">촬영/인원</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[70px]">고객</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[80px]">상품</th>
                <th className="text-center px-3 py-2.5 font-medium text-gray-600 min-w-[50px]">D+</th>
                <th className="text-left px-3 py-2.5 font-medium text-gray-600 min-w-[40px]">담당</th>
                {visibleProcesses.map(p => (
                  <th key={p.code} className="text-center px-2 py-2.5 font-medium text-gray-600 min-w-[90px]">
                    {p.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {saleWorks.length === 0 ? (
                <tr>
                  <td colSpan={7 + visibleProcesses.length} className="text-center py-12 text-gray-400 text-sm">
                    {phaseTab === 'done' ? '해당 기간에 완료된 건이 없습니다' : '해당 조건의 작업이 없습니다'}
                  </td>
                </tr>
              ) : (
                saleWorks.map(sw => (
                  <tr key={sw.sale_id} className="border-b border-gray-100 hover:bg-gray-50">
                    {/* 경로 복사 버튼 */}
                    <td className="px-2 py-2 text-center">
                      <button
                        onClick={() => copyPath(sw)}
                        className="text-gray-400 hover:text-gray-700 cursor-pointer text-sm"
                        title={buildFullPath(sw)}
                      >
                        {copyFeedback === sw.sale_id ? '✓' : '📋'}
                      </button>
                    </td>
                    <td className="px-3 py-2 sticky left-0 bg-white z-10 font-mono text-xs">
                      {sw.shoot_date ? sw.shoot_date.slice(2).replace(/-/g, '/') : '-'}
                    </td>
                    <td className="px-3 py-2 text-xs">
                      {sw.shoot_type_label || '-'}{sw.people_count ? ` ${sw.people_count}인` : ''}
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => router.push(`/search?customer_id=${sw.customer_id}`)}
                        className="text-blue-600 hover:underline cursor-pointer font-medium text-xs"
                      >
                        {sw.customer_name}
                      </button>
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600 truncate max-w-[120px]">
                      {sw.package_name || '-'}
                    </td>
                    <td className="px-3 py-2 text-center text-xs text-gray-500">
                      {daysFromShoot(sw.shoot_date)}
                    </td>
                    <td className="px-3 py-2 text-xs text-gray-600">
                      {sw.staff_name || '-'}
                    </td>
                    {visibleProcesses.map(p => {
                      const st = sw.statuses[p.code]
                      if (!st) return <td key={p.code} className="px-2 py-2 text-center text-xs text-gray-300">-</td>

                      const colorClass = STATUS_COLOR[st.status] || 'bg-gray-50 text-gray-500 border-gray-200'

                      return (
                        <td key={p.code} className="px-2 py-2 text-center">
                          <select
                            value={st.status}
                            onChange={e => updateStatus(st.id, sw.sale_id, e.target.value)}
                            className={`text-[11px] font-medium px-2 py-1 rounded-md border cursor-pointer appearance-none text-center ${colorClass}`}
                            style={{ minWidth: '78px' }}
                          >
                            {(p.status_options || []).map((opt: string) => (
                              <option key={opt} value={opt}>
                                {STATUS_LABEL[opt] || opt}
                              </option>
                            ))}
                          </select>
                        </td>
                      )
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </MainLayout>
  )
}