'use client'

import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import CustomerDetail from '@/app/components/CustomerDetail'
import { useSearchParams } from 'next/navigation'

type Customer = {
  id: string
  name: string
  phone: string | null
  phone_last4: string | null
  group_name: string
  memo: string | null
  created_at: string
  last_shoot_date?: string | null
  total_schedules?: number
  total_sales?: number
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

function getDefaultDates() {
  const end = new Date()
  const start = new Date()
  start.setMonth(start.getMonth() - 3)
  return {
    startDate: formatDateToYmd(start),
    endDate: formatDateToYmd(end),
  }
}

function formatDateToYmd(d: Date): string {
  const yy = String(d.getFullYear()).slice(2)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yy}${mm}${dd}`
}

function parseYmd(ymd: string): Date | null {
  const clean = ymd.replace(/[^0-9]/g, '')
  if (clean.length !== 6) return null
  const yy = parseInt(clean.slice(0, 2))
  const mm = parseInt(clean.slice(2, 4)) - 1
  const dd = parseInt(clean.slice(4, 6))
  const year = 2000 + yy
  const d = new Date(year, mm, dd)
  if (isNaN(d.getTime())) return null
  return d
}

function ymdToIso(ymd: string): string {
  const d = parseYmd(ymd)
  if (!d) return ''
  return d.toISOString().split('T')[0]
}

function ymdToDisplay(ymd: string): string {
  const clean = ymd.replace(/[^0-9]/g, '')
  if (clean.length !== 6) return ymd
  return `${clean.slice(0,2)}-${clean.slice(2,4)}-${clean.slice(4,6)}`
}

function ymdToDateInput(ymd: string): string {
  const d = parseYmd(ymd)
  if (!d) return ''
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function dateInputToYmd(dateStr: string): string {
  const parts = dateStr.split('-')
  if (parts.length !== 3) return ''
  return parts[0].slice(2) + parts[1] + parts[2]
}

function shiftDates(startYmd: string, endYmd: string, direction: number): { startDate: string; endDate: string } {
  const s = parseYmd(startYmd)
  const e = parseYmd(endYmd)
  if (!s || !e) return { startDate: startYmd, endDate: endYmd }
  const diff = e.getTime() - s.getTime() + 86400000
  const shift = diff * direction
  const ns = new Date(s.getTime() + shift)
  const ne = new Date(e.getTime() + shift)
  return { startDate: formatDateToYmd(ns), endDate: formatDateToYmd(ne) }
}

export default function SearchPage() {
  const searchParams = useSearchParams()
  const [searchMode, setSearchMode] = useState<'customer' | 'schedule' | 'consultation' | 'sale' | 'delivery'>('customer')
  const [keyword, setKeyword] = useState('')
  const defaults = getDefaultDates()
  const [startDate, setStartDate] = useState(defaults.startDate)
  const [endDate, setEndDate] = useState(defaults.endDate)
  const [results, setResults] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [schedules, setSchedules] = useState<ScheduleRow[]>([])
  const [searching, setSearching] = useState(false)

  useEffect(() => {
    const cid = searchParams.get('customer_id')
    if (cid) loadCustomerById(cid)
  }, [searchParams])

  async function loadCustomerById(id: string) {
    const { data } = await supabase.from('customers').select('*').eq('id', id).single()
    if (data) { setResults([data]); selectCustomer(data) }
  }

  async function handleSearch() {
    setSearching(true)
    setSelectedCustomer(null)
    setSchedules([])

    if (searchMode === 'customer') await searchCustomers()
    else if (searchMode === 'schedule') await searchBySchedule()
    else if (searchMode === 'consultation') await searchByConsultation()

    setSearching(false)
  }

  async function searchCustomers() {
    const k = keyword.trim()
    const isoStart = ymdToIso(startDate)
    const isoEnd = ymdToIso(endDate)

    let query = supabase.from('customers_with_stats').select('*')

    if (k) {
      const isPhone = /^\d{2,}$/.test(k)
      if (isPhone) query = query.eq('phone_last4', k.slice(-4))
      else query = query.ilike('name', `%${k}%`)
    }

    if (isoStart) query = query.gte('created_at', isoStart)
    if (isoEnd) query = query.lte('created_at', isoEnd + 'T23:59:59')

    const { data } = await query.order('created_at', { ascending: false }).limit(50)
    setResults(data || [])
  }

  async function searchBySchedule() {
    const isoStart = ymdToIso(startDate)
    const isoEnd = ymdToIso(endDate)

    let schedQuery = supabase.from('schedules').select('customer_id')
    if (isoStart) schedQuery = schedQuery.gte('shoot_date', isoStart)
    if (isoEnd) schedQuery = schedQuery.lte('shoot_date', isoEnd)

    if (keyword.trim()) {
      const { data: custData } = await supabase.from('customers').select('id').ilike('name', `%${keyword.trim()}%`)
      if (custData && custData.length > 0) {
        schedQuery = schedQuery.in('customer_id', custData.map(c => c.id))
      }
    }

    const { data: schedData } = await schedQuery.limit(200)
    if (!schedData || schedData.length === 0) { setResults([]); return }

    const customerIds = [...new Set(schedData.map(s => s.customer_id))]
    const { data } = await supabase.from('customers').select('*').in('id', customerIds)
    setResults(data || [])
  }

  async function searchByConsultation() {
    const isoStart = ymdToIso(startDate)
    const isoEnd = ymdToIso(endDate)

    let conQuery = supabase.from('consultations').select('customer_id')
    if (isoStart) conQuery = conQuery.gte('created_at', isoStart)
    if (isoEnd) conQuery = conQuery.lte('created_at', isoEnd + 'T23:59:59')

    if (keyword.trim()) {
      conQuery = conQuery.ilike('content', `%${keyword.trim()}%`)
    }

    const { data: conData } = await conQuery.limit(200)
    if (!conData || conData.length === 0) { setResults([]); return }

    const customerIds = [...new Set(conData.map(c => c.customer_id))]
    const { data } = await supabase.from('customers').select('*').in('id', customerIds)
    setResults(data || [])
  }

  async function selectCustomer(customer: Customer) {
    setSelectedCustomer(customer)
    const { data } = await supabase
      .from('schedules')
      .select(`*, shoot_types ( label, cal_color ), staff ( name )`)
      .eq('customer_id', customer.id)
      .order('shoot_date', { ascending: false })
    setSchedules(data || [])
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') handleSearch()
  }

  function handleShift(direction: number) {
    const shifted = shiftDates(startDate, endDate, direction)
    setStartDate(shifted.startDate)
    setEndDate(shifted.endDate)
  }

  function getStatusLabel(status: string) {
    return { wait: '확정대기', confirmed: '확정', canceled: '취소', noshow: '노쇼' }[status] || status
  }
  function getStatusColor(status: string) {
    return { wait: 'bg-yellow-100 text-yellow-800', confirmed: 'bg-green-100 text-green-800', canceled: 'bg-red-100 text-red-800', noshow: 'bg-gray-100 text-gray-800' }[status] || 'bg-gray-100 text-gray-800'
  }
  function getDepositLabel(status: string) {
    return { pending: '입금대기', paid: '입금완료', nodeposit: '면제', refunded: '환불완료' }[status] || status
  }

  const showDateFilter = true

  return (
    <MainLayout>
      <div className="flex h-[calc(100vh-52px)]">
        {/* 왼쪽 */}
        <div className="w-[400px] border-r border-gray-200 bg-white flex flex-col">
          <div className="p-4 border-b border-gray-200 space-y-3">
            {/* 검색 모드 */}
            <div className="flex gap-1.5 flex-wrap">
              {([
                { key: 'customer' as const, label: '고객' },
                { key: 'schedule' as const, label: '스케줄' },
                { key: 'consultation' as const, label: '상담' },
                { key: 'sale' as const, label: '판매' },
                { key: 'delivery' as const, label: '택배' },
              ]).map(m => (
                <button
                  key={m.key}
                  onClick={() => setSearchMode(m.key)}
                  disabled={m.key === 'sale' || m.key === 'delivery'}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition cursor-pointer ${
                    searchMode === m.key ? 'bg-gray-900 text-white'
                    : m.key === 'sale' || m.key === 'delivery' ? 'bg-gray-100 text-gray-300 cursor-not-allowed'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {/* 날짜 필터 */}
            {showDateFilter && (
              <div className="flex items-center gap-1.5">
                <button onClick={() => handleShift(-1)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 cursor-pointer">◀</button>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={ymdToDisplay(startDate)}
                    onChange={e => {
                      const clean = e.target.value.replace(/[^0-9]/g, '')
                      if (clean.length <= 6) setStartDate(clean)
                    }}
                    onBlur={() => { if (startDate.length !== 6) setStartDate(defaults.startDate) }}
                    placeholder="YY-MM-DD"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-center"
                  />
                  <input
                    type="date"
                    value={ymdToDateInput(startDate)}
                    onChange={e => setStartDate(dateInputToYmd(e.target.value))}
                    className="w-5 h-7 opacity-0 absolute"
                    style={{ position: 'relative', opacity: 0.01, width: '20px' }}
                  />
                </div>
                <span className="text-xs text-gray-400">~</span>
                <div className="flex-1 flex items-center gap-1">
                  <input
                    type="text"
                    value={ymdToDisplay(endDate)}
                    onChange={e => {
                      const clean = e.target.value.replace(/[^0-9]/g, '')
                      if (clean.length <= 6) setEndDate(clean)
                    }}
                    onBlur={() => { if (endDate.length !== 6) setEndDate(defaults.endDate) }}
                    placeholder="YY-MM-DD"
                    className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-xs text-center"
                  />
                </div>
                <button onClick={() => handleShift(1)} className="px-2 py-1.5 border border-gray-300 rounded-lg text-xs hover:bg-gray-50 cursor-pointer">▶</button>
              </div>
            )}

            {/* 검색어 */}
            <div className="flex gap-2">
              <input
                type="text"
                value={keyword}
                onChange={e => setKeyword(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  searchMode === 'customer' ? '이름 또는 전화 뒤4자리'
                  : searchMode === 'consultation' ? '상담 내용 검색'
                  : '고객명 검색'
                }
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
              />
              <button onClick={handleSearch} disabled={searching} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 cursor-pointer">검색</button>
            </div>
          </div>

          {/* 결과 목록 */}
          <div className="flex-1 overflow-y-auto">
            {results.length === 0 && !searching && (
              <div className="p-4 text-center text-gray-400 text-sm">검색 결과가 없습니다</div>
            )}
            {results.map(c => {
              const selected = selectedCustomer?.id === c.id
              const createdDate = c.created_at ? new Date(c.created_at) : null
              const createdStr = createdDate ? `${String(createdDate.getFullYear()).slice(2)}.${String(createdDate.getMonth()+1).padStart(2,'0')}.${String(createdDate.getDate()).padStart(2,'0')}` : ''
              const lastShoot = c.last_shoot_date ? `${String(new Date(c.last_shoot_date).getFullYear()).slice(2)}.${String(new Date(c.last_shoot_date).getMonth()+1).padStart(2,'0')}.${String(new Date(c.last_shoot_date).getDate()).padStart(2,'0')}` : null
              return (
                <div
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className={`px-4 py-3 border-b border-gray-100 cursor-pointer transition ${
                    selected ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-sm">{c.name}</span>
                    <span className={`text-xs ${selected ? 'text-white/60' : 'text-gray-400'}`}>{c.group_name}</span>
                  </div>
                  <div className={`text-xs mt-0.5 ${selected ? 'text-white/60' : 'text-gray-400'}`}>
                    {c.phone || '번호없음'} {c.phone_last4 ? `(${c.phone_last4})` : ''}
                  </div>
                  <div className={`text-xs mt-0.5 flex gap-3 ${selected ? 'text-white/50' : 'text-gray-400'}`}>
                    <span>등록 {createdStr}</span>
                    {lastShoot && <span>최근촬영 {lastShoot}</span>}
                    {(c.total_schedules || 0) > 0 && <span>촬영 {c.total_schedules}회</span>}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 하단 버튼 */}
          <div className="p-3 border-t border-gray-200 flex gap-2">
            <button onClick={() => window.location.href = '/customer-consult'} className="flex-1 py-2 text-center bg-gray-900 text-white rounded-lg text-xs font-medium hover:bg-gray-800 cursor-pointer">+ 상담/할일</button>
            <button
              onClick={() => {
                if (!selectedCustomer) { alert('고객을 먼저 선택하세요.'); return }
                window.location.href = `/sales/new?customer_id=${selectedCustomer.id}`
              }}
              className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 cursor-pointer"
            >
              + 판매
            </button>
            <button disabled className="flex-1 py-2 bg-gray-100 text-gray-300 rounded-lg text-xs font-medium cursor-not-allowed">알림톡</button>
          </div>
        </div>

        {/* 오른쪽 */}
        <div className="flex-1 overflow-y-auto">
          {!selectedCustomer ? (
            <div className="flex items-center justify-center h-full text-gray-400 text-sm">왼쪽에서 고객을 선택하세요</div>
          ) : (
            <CustomerDetail
              customer={selectedCustomer}
              schedules={schedules}
              getStatusLabel={getStatusLabel}
              getStatusColor={getStatusColor}
              getDepositLabel={getDepositLabel}
              onCustomerUpdated={(updated) => { setSelectedCustomer(updated); setResults(prev => prev.map(c => c.id === updated.id ? updated : c)) }}
              onScheduleAdded={() => selectCustomer(selectedCustomer!)}
            />
          )}
        </div>
      </div>
    </MainLayout>
  )
}