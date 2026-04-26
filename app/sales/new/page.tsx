'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import SaleStepNav from '@/app/components/sales/SaleStepNav'
import Step1Basic from '@/app/components/sales/Step1Basic'
import Step2Process from '@/app/components/sales/Step2Process'
import Step3Items from '@/app/components/sales/Step3Items'
import Step4Delivery, { type Delivery } from '@/app/components/sales/Step4Delivery'
import Step5Contact from '@/app/components/sales/Step5Contact'
import Step6Notice from '@/app/components/sales/Step6Notice'
import Step7Payment, { type Payment } from '@/app/components/sales/Step7Payment'
import type {
  SaleLine, PriceItem, PriceItemOption, PricePackage, PricePackageItem,
} from '@/lib/sales'
import { calcLineAmount, genTmpId } from '@/lib/sales'

type Customer = { id: string; name: string; phone: string | null }
type Schedule = { id: string; customer_id: string; shoot_date: string; people_count: number; customers: Customer }
type ViewMode = 'simple' | 'presentation' | 'id_photo'

export default function NewSalePage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const scheduleIdParam = searchParams.get('schedule_id')
  const customerIdParam = searchParams.get('customer_id')
  const modeParam = searchParams.get('mode')

  const [viewMode, setViewMode] = useState<ViewMode>('simple')
  const [currentStep, setCurrentStep] = useState(1)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const [staffId, setStaffId] = useState('')
  const [staffName, setStaffName] = useState('')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [customerSchedules, setCustomerSchedules] = useState<Schedule[]>([])
  const [shootTypeCode, setShootTypeCode] = useState('')

  const [priceTableId, setPriceTableId] = useState('')
  const [menuVersion, setMenuVersion] = useState('')
  const [packages, setPackages] = useState<PricePackage[]>([])
  const [items, setItems] = useState<PriceItem[]>([])
  const [itemOptions, setItemOptions] = useState<PriceItemOption[]>([])
  const [packageItemsMap, setPackageItemsMap] = useState<Record<string, PricePackageItem[]>>({})

  const [selectedCategory, setSelectedCategory] = useState<string>('family')
  const [selectedPackageId, setSelectedPackageId] = useState<string>('')
  const [peopleCount, setPeopleCount] = useState<number>(0)

  const [lines, setLines] = useState<SaleLine[]>([])
  const [showPrice, setShowPrice] = useState(false)

  const [deliveries, setDeliveries] = useState<Delivery[]>([])
  const [isPickup, setIsPickup] = useState(false)

  const [retouchName, setRetouchName] = useState('')
  const [retouchPhone, setRetouchPhone] = useState('')
  const [retouchMemo, setRetouchMemo] = useState('')
  const [emails, setEmails] = useState<{ _tmp_id: string; email: string }[]>([])

  const [discount, setDiscount] = useState(0)
  const [depositAmount, setDepositAmount] = useState(0)
  const [payments, setPayments] = useState<Payment[]>([])
  const [memo, setMemo] = useState('')

  const [customerSearchQuery, setCustomerSearchQuery] = useState('')
  const [customerSearchResults, setCustomerSearchResults] = useState<Customer[]>([])
  const [customerSearching, setCustomerSearching] = useState(false)
  const [showNewCustomerForm, setShowNewCustomerForm] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [newCustomerPhone, setNewCustomerPhone] = useState('')
  const [newCustomerGroup, setNewCustomerGroup] = useState('유유히')
  const [creatingCustomer, setCreatingCustomer] = useState(false)

  useEffect(() => { loadInit() }, [])

  async function loadInit() {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: staff } = await supabase.from('staff').select('id, name').eq('auth_user_id', user.id).single()
      if (staff) { setStaffId(staff.id); setStaffName(staff.name) }
    }

    const { data: pt } = await supabase.from('price_tables').select('id, version_code').eq('is_active', true).order('created_at', { ascending: false }).limit(1).single()
    if (pt) {
      setPriceTableId(pt.id); setMenuVersion(pt.version_code)
      const { data: pkgs } = await supabase.from('price_packages').select('*').eq('price_table_id', pt.id).eq('is_active', true).order('sort_order')
      if (pkgs) setPackages(pkgs as any)
      const { data: its } = await supabase.from('price_items').select('*').eq('price_table_id', pt.id).eq('is_active', true).order('sort_order')
      if (its) setItems(its as any)
      const { data: opts } = await supabase.from('price_item_options').select('*').eq('is_active', true).order('sort_order')
      if (opts) setItemOptions(opts as any)
      const { data: ppItems } = await supabase.from('price_package_items').select('*').order('sort_order')
      if (ppItems) {
        const map: Record<string, PricePackageItem[]> = {}
        ;(ppItems as any[]).forEach(it => { if (!map[it.package_id]) map[it.package_id] = []; map[it.package_id].push(it) })
        setPackageItemsMap(map)
      }
    }

    if (modeParam === 'id_photo') { setViewMode('id_photo'); setSelectedCategory('id_photo') }

    if (scheduleIdParam) {
      const { data: sch } = await supabase.from('schedules')
        .select('id, customer_id, shoot_date, people_count, customers ( id, name, phone ), shoot_types:shoot_type_id ( code )')
        .eq('id', scheduleIdParam).single()
      if (sch) {
        setSchedule(sch as any); setCustomer((sch as any).customers); setPeopleCount((sch as any).people_count || 0)
        const stCode = (sch as any).shoot_types?.code || ''
        setShootTypeCode(stCode)
        if (stCode === 'id_photo') { setViewMode('id_photo'); setSelectedCategory('id_photo') }
        setDeliveries([{ _tmp_id: genTmpId(), recipient_name: (sch as any).customers?.name || '', phone: (sch as any).customers?.phone || '', postal_code: '', address_main: '', address_detail: '', memo: '', is_pickup: false }])
        const { data: deps } = await supabase.from('deposits').select('amount, type').eq('schedule_id', scheduleIdParam).in('type', ['paid'])
        if (deps && deps.length > 0) setDepositAmount(deps.reduce((s: number, d: any) => s + (d.amount || 0), 0))
      }
    } else if (customerIdParam) {
      const { data: cust } = await supabase.from('customers').select('id, name, phone').eq('id', customerIdParam).single()
      if (cust) {
        setCustomer(cust as Customer)
        setDeliveries([{ _tmp_id: genTmpId(), recipient_name: cust.name || '', phone: cust.phone || '', postal_code: '', address_main: '', address_detail: '', memo: '', is_pickup: false }])
        const { data: schList } = await supabase.from('schedules').select('id, customer_id, shoot_date, people_count, customers ( id, name, phone )').eq('customer_id', customerIdParam).order('shoot_date', { ascending: false }).limit(20)
        if (schList && schList.length > 0) setCustomerSchedules(schList as any)
      }
    } else {
      setDeliveries([{ _tmp_id: genTmpId(), recipient_name: '', phone: '', postal_code: '', address_main: '', address_detail: '', memo: '', is_pickup: false }])
    }
    setLoading(false)
  }

  function applyCustomer(c: Customer) {
    setCustomer(c)
    setDeliveries(prev => { if (prev.length === 1 && !prev[0].recipient_name) return [{ ...prev[0], recipient_name: c.name || '', phone: c.phone || '' }]; return prev })
    loadCustomerSchedules(c.id)
  }

  async function loadCustomerSchedules(custId: string) {
    const { data: schList } = await supabase.from('schedules').select('id, customer_id, shoot_date, people_count, customers ( id, name, phone )').eq('customer_id', custId).order('shoot_date', { ascending: false }).limit(20)
    setCustomerSchedules(schList && schList.length > 0 ? (schList as any) : [])
  }

  async function selectSchedule(schId: string) {
    if (!schId) { setSchedule(null); setDepositAmount(0); return }
    const sch = customerSchedules.find(s => s.id === schId)
    if (sch) {
      setSchedule(sch); setPeopleCount(sch.people_count || 0)
      const { data: deps } = await supabase.from('deposits').select('amount, type').eq('schedule_id', schId).in('type', ['paid'])
      setDepositAmount(deps && deps.length > 0 ? deps.reduce((s: number, d: any) => s + (d.amount || 0), 0) : 0)
    }
  }

  async function createIdPhotoSchedule(custId: string): Promise<string | null> {
    const { data: st } = await supabase.from('shoot_types').select('id').eq('code', 'id_photo').single()
    if (!st) { alert('증명 촬영종류를 찾을 수 없습니다'); return null }
    const now = new Date()
    const shootDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    const startMin = now.getMinutes() < 30 ? '00' : '30'
    const startAt = `${String(now.getHours()).padStart(2, '0')}:${startMin}`
    const endDate = new Date(now.getTime())
    if (now.getMinutes() < 30) { endDate.setMinutes(30) } else { endDate.setHours(endDate.getHours() + 1); endDate.setMinutes(0) }
    const endAt = `${String(endDate.getHours()).padStart(2, '0')}:${String(endDate.getMinutes()).padStart(2, '0')}`
    const { data: sch, error } = await supabase.from('schedules').insert({
      customer_id: custId, shoot_type_id: st.id, people_count: peopleCount || 1,
      shoot_date: shootDate, start_at: startAt, end_at: endAt,
      status: 'confirmed', deposit_status: 'nodeposit', memo: '증명사진 자동생성', staff_id: staffId,
    }).select('id, customer_id, shoot_date, people_count, customers ( id, name, phone )').single()
    if (error || !sch) { alert('스케줄 생성 실패: ' + (error?.message || '')); return null }
    setSchedule(sch as any); setShootTypeCode('id_photo')
    return sch.id
  }

  async function handleCustomerSearch() {
    const q = customerSearchQuery.trim(); if (!q) return
    setCustomerSearching(true)
    const phoneDigits = q.replace(/[^0-9]/g, '')
    let query = supabase.from('customers').select('id, name, phone').eq('is_deleted', false).limit(10)
    if (phoneDigits.length >= 4) query = query.or(`phone.ilike.%${phoneDigits}%,phone_last4.eq.${phoneDigits.slice(-4)}`)
    else query = query.ilike('name', `%${q}%`)
    const { data } = await query
    setCustomerSearchResults((data as Customer[]) || [])
    setCustomerSearching(false)
  }

  async function handleCreateCustomer() {
    if (!newCustomerName.trim()) { alert('이름을 입력하세요.'); return }
    setCreatingCustomer(true)
    const phoneDigits = newCustomerPhone.replace(/[^0-9]/g, '')
    const last4 = phoneDigits.length >= 4 ? phoneDigits.slice(-4) : (phoneDigits || null)
    const { data, error } = await supabase.from('customers').insert({ name: newCustomerName.trim(), phone: phoneDigits || null, phone_last4: last4, group_name: newCustomerGroup, staff_id: staffId || null }).select('id, name, phone').single()
    setCreatingCustomer(false)
    if (error || !data) { alert('고객 등록 실패: ' + (error?.message || '')); return }
    applyCustomer(data as Customer); setShowNewCustomerForm(false); setNewCustomerName(''); setNewCustomerPhone(''); setCustomerSearchResults([]); setCustomerSearchQuery('')
  }

  const selectedPackage = packages.find(p => p.id === selectedPackageId) || null
  const selectedCategoryPackages = packages.filter(p => p.category === selectedCategory)

  function applyPackage(packageId: string) {
    setSelectedPackageId(packageId)
    if (!packageId) { setLines([]); return }
    const pkg = packages.find(p => p.id === packageId); if (!pkg) return
    const ppItems = packageItemsMap[packageId] || []
    const newLines: SaleLine[] = ppItems.map((pi, idx) => {
      const item = items.find(i => i.id === pi.item_id); if (!item) return null as any
      const defaultOpt = itemOptions.find(o => o.item_id === pi.item_id && o.is_default)
      return { _tmp_id: genTmpId(), line_no: idx + 1, item_id: pi.item_id, item_code: item.code, item_label: null, qty: pi.qty, bill_people: item.price_unit_type === 'person' ? peopleCount || pkg.base_people : null, option_id: defaultOpt?.id || null, option_text: defaultOpt?.option_name || null, base_unit_price: item.base_price, option_price_diff: defaultOpt?.price_diff || 0, retouch_extra_price: 0, unit_price: 0, line_discount: 0, line_amount: 0, line_type: 'default', is_visible: true, upgrades_line_id: null, description: pi.memo || null, memo: null, _retouch_base_people: pi.retouch_base_people, _retouch_extra_per_person: pi.retouch_extra_per_person }
    }).filter(Boolean)
    setLines(newLines)
  }

  function changeCategory(cat: string) { setSelectedCategory(cat); setSelectedPackageId(''); setLines([]) }

  function changePeopleCount(n: number) {
    setPeopleCount(n)
    setLines(prev => prev.map(l => {
      if (l.line_type !== 'default') return l
      const item = items.find(i => i.id === l.item_id); if (!item || item.price_unit_type !== 'person') return l
      const updated = { ...l, bill_people: n }; const calc = calcLineAmount(updated)
      return { ...updated, unit_price: calc.unit_price, retouch_extra_price: calc.retouch_extra, line_amount: calc.line_amount }
    }))
  }

  const updateLine = useCallback((tmpId: string, patch: Partial<SaleLine>) => { setLines(prev => prev.map(l => l._tmp_id !== tmpId ? l : { ...l, ...patch })) }, [])
  const deleteLine = useCallback((tmpId: string) => { setLines(prev => prev.filter(l => l._tmp_id !== tmpId)) }, [])
  const addLine = useCallback((category: string) => {
    const categoryItems = items.filter(i => i.item_category === category).sort((a, b) => a.sort_order - b.sort_order); if (categoryItems.length === 0) return
    const item = categoryItems[0]; const defaultOpt = itemOptions.find(o => o.item_id === item.id && o.is_default)
    const newLine: SaleLine = { _tmp_id: genTmpId(), line_no: lines.length + 1, item_id: item.id, item_code: item.code, item_label: null, qty: 1, bill_people: item.price_unit_type === 'person' ? (peopleCount || 0) : null, option_id: defaultOpt?.id || null, option_text: defaultOpt?.option_name || null, base_unit_price: item.base_price, option_price_diff: defaultOpt?.price_diff || 0, retouch_extra_price: 0, unit_price: 0, line_discount: 0, line_amount: 0, line_type: 'add', is_visible: true, upgrades_line_id: null, description: null, memo: null, _retouch_base_people: 4, _retouch_extra_per_person: 10000 }
    const calc = calcLineAmount(newLine); newLine.unit_price = calc.unit_price; newLine.retouch_extra_price = calc.retouch_extra; newLine.line_amount = calc.line_amount
    setLines(prev => [...prev, newLine])
  }, [items, itemOptions, lines.length, peopleCount])
  const upgradeLine = useCallback((tmpId: string, newItemId: string) => {
    setLines(prev => prev.map(l => {
      if (l._tmp_id !== tmpId) return l
      const newItem = items.find(i => i.id === newItemId); const origItem = items.find(i => i.id === l.item_id); if (!newItem || !origItem) return l
      const bp = l.bill_people || 0; const rb = l._retouch_base_people; const re = l._retouch_extra_per_person || 0
      let nre = 0; if (rb != null && bp > rb) nre = (bp - rb) * re
      let ore = 0; if (rb != null && bp > rb) ore = (bp - rb) * re
      const diff = (newItem.base_price + nre) - (origItem.base_price + ore)
      return { ...l, item_id: newItem.id, item_code: newItem.code, item_label: `${origItem.name} → ${newItem.name}`, base_unit_price: newItem.base_price, unit_price: diff, retouch_extra_price: nre, line_amount: diff * l.qty - l.line_discount, line_type: 'upgrade' }
    }))
  }, [items])

  function addDelivery() { setDeliveries(prev => [...prev, { _tmp_id: genTmpId(), recipient_name: '', phone: '', postal_code: '', address_main: '', address_detail: '', memo: '', is_pickup: false }]) }
  function updateDelivery(tmpId: string, patch: Partial<Delivery>) { setDeliveries(prev => prev.map(d => d._tmp_id === tmpId ? { ...d, ...patch } : d)) }
  function deleteDelivery(tmpId: string) { setDeliveries(prev => prev.filter(d => d._tmp_id !== tmpId)) }
  function addEmail() { setEmails(prev => [...prev, { _tmp_id: genTmpId(), email: '' }]) }
  function updateEmail(tmpId: string, email: string) { setEmails(prev => prev.map(e => e._tmp_id === tmpId ? { ...e, email } : e)) }
  function deleteEmail(tmpId: string) { setEmails(prev => prev.filter(e => e._tmp_id !== tmpId)) }
  function addPayment() { setPayments(prev => [...prev, { _tmp_id: genTmpId(), amount: 0, method: 'card', method_detail: '' }]) }
  function updatePayment(tmpId: string, patch: Partial<Payment>) { setPayments(prev => prev.map(p => p._tmp_id === tmpId ? { ...p, ...patch } : p)) }
  function deletePayment(tmpId: string) { setPayments(prev => prev.filter(p => p._tmp_id !== tmpId)) }

  const basePrice = selectedPackage ? selectedPackage.base_price + Math.max(0, (peopleCount - selectedPackage.base_people)) * selectedPackage.extra_people_unit_price : 0
  const lineSum = lines.filter(l => l.is_visible !== false).reduce((s, l) => s + l.line_amount, 0)
  const totalAmount = basePrice + lineSum - discount - depositAmount

  function goPrev() { if (currentStep > 1) setCurrentStep(currentStep - 1) }
  function goNext() { if (currentStep < 7) setCurrentStep(currentStep + 1) }
  useEffect(() => {
    if (viewMode !== 'presentation') return
    function handleKey(e: KeyboardEvent) { if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return; if (e.key === 'ArrowRight') goNext(); else if (e.key === 'ArrowLeft') goPrev() }
    window.addEventListener('keydown', handleKey); return () => window.removeEventListener('keydown', handleKey)
  }, [currentStep, viewMode])

  async function handleSave(status: 'draft' | 'confirmed') {
    if (!customer) { alert('고객 정보가 없습니다'); return }
    if (status === 'confirmed' && !selectedPackageId && lines.length === 0) { alert('상품 또는 추가 항목을 1개 이상 선택하세요'); return }
    setSaving(true)

    let currentScheduleId = schedule?.id || null
    if (viewMode === 'id_photo' && !currentScheduleId && status === 'confirmed') {
      const newSchId = await createIdPhotoSchedule(customer.id)
      if (!newSchId) { setSaving(false); return }
      currentScheduleId = newSchId
    }

    const paymentStatus = (() => { const paidSum = payments.reduce((s, p) => s + (p.amount || 0), 0); if (paidSum === 0) return 'pending'; if (paidSum >= totalAmount) return 'paid'; return 'partial' })()

    const { data: sale, error: saleErr } = await supabase.from('sales').insert({
      schedule_id: currentScheduleId, customer_id: customer.id, staff_id: staffId, price_table_id: priceTableId, menu_version: menuVersion,
      package_id: selectedPackageId || null, package_code: selectedPackage?.code || null, package_name: selectedPackage?.name || null,
      shoot_people: peopleCount || null, base_price: basePrice, line_sum: lineSum, discount, deposit_deduct: depositAmount,
      total_amount: totalAmount, sale_status: status, payment_status: paymentStatus,
      retouch_contact_name: retouchName || null, retouch_contact_phone: retouchPhone || null, retouch_contact_memo: retouchMemo || null, memo: memo || null,
    }).select('id').single()
    if (saleErr || !sale) { alert('판매 저장 실패: ' + saleErr?.message); setSaving(false); return }
    const saleId = sale.id

    if (lines.length > 0) { const li = lines.map((l, idx) => ({ sale_id: saleId, line_no: idx + 1, item_id: l.item_id, item_code: l.item_code, item_label: l.item_label, qty: l.qty, bill_people: l.bill_people, option_id: l.option_id, option_text: l.option_text, base_unit_price: l.base_unit_price, option_price_diff: l.option_price_diff, retouch_extra_price: l.retouch_extra_price, unit_price: l.unit_price, line_discount: l.line_discount, line_amount: l.line_amount, line_type: l.line_type, is_visible: l.is_visible, description: l.description, memo: l.memo })); const { error: lineErr } = await supabase.from('sale_lines').insert(li); if (lineErr) { alert('라인 저장 실패: ' + lineErr.message); setSaving(false); return } }
    if (!isPickup && deliveries.length > 0) { const di = deliveries.filter(d => d.recipient_name).map(d => ({ sale_id: saleId, recipient_name: d.recipient_name, phone: d.phone, postal_code: d.postal_code || null, address_main: d.address_main || null, address_detail: d.address_detail || null, memo: d.memo || null, is_pickup: false })); if (di.length > 0) await supabase.from('deliveries').insert(di) } else if (isPickup) { await supabase.from('deliveries').insert({ sale_id: saleId, recipient_name: customer.name, phone: customer.phone || '', is_pickup: true }) }
    if (emails.length > 0) { const ei = emails.filter(e => e.email.trim()).map(e => ({ sale_id: saleId, email: e.email.trim(), send_status: 'pending' })); if (ei.length > 0) await supabase.from('sale_email_recipients').insert(ei) }
    if (payments.length > 0) { const pi = payments.filter(p => p.amount > 0).map(p => ({ sale_id: saleId, amount: p.amount, method: p.method, method_detail: p.method_detail || null })); if (pi.length > 0) await supabase.from('payments').insert(pi) }
    if (depositAmount > 0 && currentScheduleId) { await supabase.from('deposits').insert({ schedule_id: currentScheduleId, customer_id: customer.id, type: 'deducted', amount: depositAmount, sale_id: saleId, memo: '판매 차감' }) }

    if (status === 'confirmed') {
      const { data: procs } = await supabase.from('work_processes').select('id, code').eq('is_active', true).order('sort_order')
      if (procs && procs.length > 0) {
        let stCode = shootTypeCode
        if (!stCode && currentScheduleId) { const { data: sd } = await supabase.from('schedules').select('shoot_types:shoot_type_id ( code )').eq('id', currentScheduleId).single(); stCode = (sd as any)?.shoot_types?.code || '' }
        const isIdPhoto = stCode === 'id_photo'
        const lc = lines.map(l => { const it = items.find(i => i.id === l.item_id); return it?.item_category || '' })
        const hasFrame = lc.includes('item_frame'); const hasPrint = lc.includes('item_pr'); const hasAlbum = lc.includes('item_album')
        const wi = procs.map(p => {
          let is2 = 'pending'
          if (isIdPhoto) { if (p.code === 'original_send') is2 = 'pending'; else if (p.code === 'packing') is2 = 'none_file_only'; else is2 = 'none' }
          else { if (p.code === 'order_frame' && !hasFrame) is2 = 'none'; if (p.code === 'order_print' && !hasPrint) is2 = 'none'; if (p.code === 'order_album' && !hasAlbum) is2 = 'none'; if (p.code === 'packing') { if (isPickup) is2 = 'pickup_ready'; else if (deliveries.length === 0 || (deliveries.length === 1 && !deliveries[0].recipient_name)) is2 = 'none_file_only'; else is2 = 'shipping_ready' } }
          return { sale_id: saleId, process_id: p.id, status: is2, assigned_staff_id: staffId || null }
        })
        await supabase.from('sale_work_status').insert(wi)
      }
    }
    setSaving(false); alert('저장되었습니다'); router.push(`/search?customer_id=${customer.id}`)
  }

  if (loading) return <MainLayout><div className="min-h-screen flex items-center justify-center"><p className="text-gray-400">로딩 중...</p></div></MainLayout>

  // ── 고객 미선택 ──
  if (!customer) {
    return (
      <MainLayout>
        <div className="max-w-xl mx-auto p-6">
          <h2 className="text-lg font-bold mb-4">고객 선택</h2>
          <p className="text-sm text-gray-500 mb-6">판매 등록을 시작하려면 먼저 고객을 선택하거나 등록하세요.</p>
          {!showNewCustomerForm ? (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">고객 검색</label>
                <div className="flex gap-2"><input type="text" value={customerSearchQuery} onChange={e => setCustomerSearchQuery(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleCustomerSearch() }} placeholder="이름 또는 전화번호" className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" /><button onClick={handleCustomerSearch} disabled={customerSearching} className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 cursor-pointer">{customerSearching ? '검색 중...' : '검색'}</button></div></div>
              {customerSearchResults.length > 0 && <div className="border border-gray-200 rounded-lg divide-y divide-gray-100">{customerSearchResults.map(c => <button key={c.id} onClick={() => applyCustomer(c)} className="w-full text-left px-4 py-3 hover:bg-gray-50 cursor-pointer"><div className="font-medium text-sm">{c.name}</div>{c.phone && <div className="text-xs text-gray-500 mt-0.5">{c.phone}</div>}</button>)}</div>}
              {customerSearchResults.length === 0 && customerSearchQuery && !customerSearching && <div className="text-xs text-gray-400 px-1">검색 결과가 없습니다</div>}
              <div className="pt-2 border-t border-gray-100"><button onClick={() => setShowNewCustomerForm(true)} className="text-sm text-blue-600 hover:underline cursor-pointer">+ 새 고객 등록</button></div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between"><h3 className="font-medium">새 고객 등록</h3><button onClick={() => setShowNewCustomerForm(false)} className="text-sm text-gray-500 hover:underline cursor-pointer">← 검색으로</button></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">이름 *</label><input type="text" value={newCustomerName} onChange={e => setNewCustomerName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">전화번호</label><input type="tel" value={newCustomerPhone} onChange={e => setNewCustomerPhone(e.target.value)} placeholder="010-1234-5678" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">소속</label><select value={newCustomerGroup} onChange={e => setNewCustomerGroup(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"><option value="유유히">유유히</option><option value="모디온">모디온</option><option value="웨이블루">웨이블루</option></select></div>
              <button onClick={handleCreateCustomer} disabled={creatingCustomer} className="w-full py-2.5 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50 cursor-pointer">{creatingCustomer ? '등록 중...' : '등록하고 계속'}</button>
            </div>
          )}
        </div>
      </MainLayout>
    )
  }

  // ── 공통 헤더 ──
  const header = (
    <div className="max-w-3xl mx-auto px-6 pt-4 pb-2 flex items-center justify-between">
      <div className="text-sm text-gray-500"><span className="font-medium text-gray-900">{customer.name}</span>{schedule?.shoot_date && <span className="ml-2 text-gray-400">· {schedule.shoot_date}</span>}</div>
      <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
        <button onClick={() => setViewMode('simple')} className={`px-3 py-1 text-xs rounded-md cursor-pointer transition ${viewMode === 'simple' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>간단</button>
        <button onClick={() => setViewMode('presentation')} className={`px-3 py-1 text-xs rounded-md cursor-pointer transition ${viewMode === 'presentation' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>프레젠테이션</button>
        <button onClick={() => { setViewMode('id_photo'); setSelectedCategory('id_photo') }} className={`px-3 py-1 text-xs rounded-md cursor-pointer transition ${viewMode === 'id_photo' ? 'bg-white text-gray-900 shadow-sm font-medium' : 'text-gray-500 hover:text-gray-700'}`}>증명</button>
      </div>
    </div>
  )

  const productSelector = (
    <div className="flex flex-wrap gap-3 items-end">
      <div><label className="text-xs text-gray-500 block mb-1">카테고리</label><select value={selectedCategory} onChange={e => changeCategory(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">{[...new Set(packages.map(p => p.category))].map(cat => { const p = packages.find(pp => pp.category === cat); return <option key={cat} value={cat}>{p?.category_name || cat}</option> })}</select></div>
      <div><label className="text-xs text-gray-500 block mb-1">상품 <span className="text-gray-400">(선택)</span></label><select value={selectedPackageId} onChange={e => applyPackage(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-w-[180px]"><option value="">선택 안 함 (단품 판매)</option>{selectedCategoryPackages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
      <div><label className="text-xs text-gray-500 block mb-1">인원</label><input type="number" min={0} value={peopleCount} onChange={e => changePeopleCount(Number(e.target.value))} className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm" /></div>
    </div>
  )

  // ══════════════════════════════════════
  // 증명 모드
  // ══════════════════════════════════════
  if (viewMode === 'id_photo') {
    return (
      <MainLayout>
        {header}
        <div className="max-w-2xl mx-auto px-6 pb-12 space-y-5">
          {/* 상품 선택 */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">증명사진 판매</h3>
            <div className="flex flex-wrap gap-3 items-end">
              <div><label className="text-xs text-gray-500 block mb-1">상품</label>
                <select value={selectedPackageId} onChange={e => applyPackage(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm min-w-[180px]">
                  <option value="">선택</option>
                  {packages.filter(p => p.category === 'id_photo').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div><label className="text-xs text-gray-500 block mb-1">인원</label>
                <input type="number" min={1} value={peopleCount || 1} onChange={e => changePeopleCount(Number(e.target.value))} className="w-20 px-3 py-2 border border-gray-200 rounded-lg text-sm" />
              </div>
              {selectedPackage && <div className="text-sm text-gray-600">{selectedPackage.name} · {fmtPrice(basePrice)}원</div>}
            </div>
            {lines.length > 0 && (
              <div className="mt-4">
                <Step3Items lines={lines} items={items} options={itemOptions} showPrice={showPrice} onTogglePrice={() => setShowPrice(v => !v)} onUpdateLine={updateLine} onDeleteLine={deleteLine} onAddLine={addLine} onUpgradeLine={upgradeLine} />
              </div>
            )}
          </section>

          {/* 파일전송 */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">파일전송</h3>
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">카카오 (연락처)</label>
                <div className="flex gap-2">
                  <input
                    type="tel"
                    value={retouchPhone}
                    onChange={e => setRetouchPhone(e.target.value)}
                    placeholder="010-1234-5678"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                  <button
                    onClick={() => { setRetouchPhone(customer?.phone || ''); setRetouchName(customer?.name || '') }}
                    className="px-3 py-2 text-xs border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50 cursor-pointer whitespace-nowrap"
                  >
                    예약자와 동일
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">이메일</label>
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={emails.length > 0 ? emails[0].email : ''}
                    onChange={e => {
                      if (emails.length === 0) { setEmails([{ _tmp_id: genTmpId(), email: e.target.value }]) }
                      else { updateEmail(emails[0]._tmp_id, e.target.value) }
                    }}
                    placeholder="example@email.com"
                    className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* 결제 */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">결제</h3>
            <Step7Payment customerName={customer?.name || ''} shootDate={schedule?.shoot_date || ''} packageInfo={selectedPackage} peopleCount={peopleCount} basePrice={basePrice} lines={lines} items={items} discount={discount} onDiscountChange={setDiscount} depositAmount={depositAmount} payments={payments} onPaymentAdd={addPayment} onPaymentUpdate={updatePayment} onPaymentDelete={deletePayment} />
          </section>

          {/* 메모 */}
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <label className="text-xs text-gray-500 block mb-1">메모</label>
            <textarea value={memo} onChange={e => setMemo(e.target.value)} rows={2} placeholder="특이사항" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none" />
          </section>

          {!schedule && <p className="text-xs text-gray-400 text-center">확정 저장 시 오늘 날짜로 스케줄이 자동 생성됩니다.</p>}

          <div className="flex gap-3">
            <button onClick={() => handleSave('draft')} disabled={saving} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-50">작성중 저장</button>
            <button onClick={() => handleSave('confirmed')} disabled={saving} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50">{saving ? '저장 중...' : '확정 저장'}</button>
          </div>
        </div>
      </MainLayout>
    )
  }

  // ══════════════════════════════════════
  // 간단 모드
  // ══════════════════════════════════════
  if (viewMode === 'simple') {
    return (
      <MainLayout>
        {header}
        <div className="max-w-3xl mx-auto px-6 pb-12 space-y-6">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4"><h3 className="text-sm font-semibold text-gray-700">기초 정보</h3><span className="text-xs text-gray-400">담당 {staffName || '-'}</span></div>
            {!scheduleIdParam && customerSchedules.length > 0 && (<div className="mb-4"><label className="text-xs text-gray-500 block mb-1">스케줄 귀속</label><select value={schedule?.id || ''} onChange={e => selectSchedule(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full"><option value="">귀속 안 함 (스케줄 없이 판매)</option>{customerSchedules.map(s => <option key={s.id} value={s.id}>{s.shoot_date} · {s.people_count}인</option>)}</select></div>)}
            {productSelector}
            {selectedPackage && <div className="mt-4 text-sm text-gray-600">{selectedPackage.category_name} / {selectedPackage.name} · {peopleCount}인 <span className="ml-2 text-gray-400">기본 {selectedPackage.base_people}인</span></div>}
          </section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5"><h3 className="text-sm font-semibold text-gray-700 mb-3">제공 내역</h3><Step3Items lines={lines} items={items} options={itemOptions} showPrice={showPrice} onTogglePrice={() => setShowPrice(v => !v)} onUpdateLine={updateLine} onDeleteLine={deleteLine} onAddLine={addLine} onUpgradeLine={upgradeLine} /></section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5"><h3 className="text-sm font-semibold text-gray-700 mb-3">택배 정보</h3><Step4Delivery deliveries={deliveries} customerName={customer?.name} customerPhone={customer?.phone} onAdd={addDelivery} onUpdate={updateDelivery} onDelete={deleteDelivery} isPickup={isPickup} onTogglePickup={setIsPickup} /></section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5"><h3 className="text-sm font-semibold text-gray-700 mb-3">연락처</h3><Step5Contact retouchName={retouchName} retouchPhone={retouchPhone} retouchMemo={retouchMemo} onRetouchChange={patch => { if (patch.retouch_contact_name !== undefined) setRetouchName(patch.retouch_contact_name); if (patch.retouch_contact_phone !== undefined) setRetouchPhone(patch.retouch_contact_phone); if (patch.retouch_contact_memo !== undefined) setRetouchMemo(patch.retouch_contact_memo) }} customerName={customer?.name} customerPhone={customer?.phone} emails={emails} onEmailAdd={addEmail} onEmailUpdate={updateEmail} onEmailDelete={deleteEmail} /></section>
          <section className="bg-white rounded-2xl border border-gray-200 p-5"><h3 className="text-sm font-semibold text-gray-700 mb-3">결제</h3><Step7Payment customerName={customer?.name || ''} shootDate={schedule?.shoot_date || ''} packageInfo={selectedPackage} peopleCount={peopleCount} basePrice={basePrice} lines={lines} items={items} discount={discount} onDiscountChange={setDiscount} depositAmount={depositAmount} payments={payments} onPaymentAdd={addPayment} onPaymentUpdate={updatePayment} onPaymentDelete={deletePayment} /></section>
          <div className="flex gap-3 pt-2"><button onClick={() => handleSave('draft')} disabled={saving} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-50">작성중 저장</button><button onClick={() => handleSave('confirmed')} disabled={saving} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50">{saving ? '저장 중...' : '확정 저장'}</button></div>
        </div>
      </MainLayout>
    )
  }

  // ══════════════════════════════════════
  // 프레젠테이션 모드
  // ══════════════════════════════════════
  return (
    <MainLayout>
      {header}
      <SaleStepNav currentStep={currentStep} onStepClick={setCurrentStep} />
      <div className="relative min-h-[calc(100vh-200px)]">
        {currentStep > 1 && <button onClick={goPrev} className="fixed left-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-3xl text-gray-400 hover:text-gray-700 cursor-pointer z-40">←</button>}
        {currentStep < 7 && <button onClick={goNext} className="fixed right-4 top-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-white/80 hover:bg-white shadow-md flex items-center justify-center text-3xl text-gray-400 hover:text-gray-700 cursor-pointer z-40">→</button>}
        {currentStep === 1 && (<div><div className="max-w-3xl mx-auto p-6 bg-white border-b border-gray-100">{!scheduleIdParam && customerSchedules.length > 0 && (<div className="mb-4"><label className="text-xs text-gray-500 block mb-1">스케줄 귀속</label><select value={schedule?.id || ''} onChange={e => selectSchedule(e.target.value)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm w-full max-w-sm"><option value="">귀속 안 함</option>{customerSchedules.map(s => <option key={s.id} value={s.id}>{s.shoot_date} · {s.people_count}인</option>)}</select></div>)}{productSelector}</div><Step1Basic customerName={customer?.name || ''} shootDate={schedule?.shoot_date || ''} packageInfo={selectedPackage} peopleCount={peopleCount} staffName={staffName} /></div>)}
        {currentStep === 2 && <Step2Process processSteps={selectedPackage?.process_steps || null} />}
        {currentStep === 3 && <Step3Items lines={lines} items={items} options={itemOptions} showPrice={showPrice} onTogglePrice={() => setShowPrice(v => !v)} onUpdateLine={updateLine} onDeleteLine={deleteLine} onAddLine={addLine} onUpgradeLine={upgradeLine} />}
        {currentStep === 4 && <Step4Delivery deliveries={deliveries} customerName={customer?.name} customerPhone={customer?.phone} onAdd={addDelivery} onUpdate={updateDelivery} onDelete={deleteDelivery} isPickup={isPickup} onTogglePickup={setIsPickup} />}
        {currentStep === 5 && <Step5Contact retouchName={retouchName} retouchPhone={retouchPhone} retouchMemo={retouchMemo} onRetouchChange={patch => { if (patch.retouch_contact_name !== undefined) setRetouchName(patch.retouch_contact_name); if (patch.retouch_contact_phone !== undefined) setRetouchPhone(patch.retouch_contact_phone); if (patch.retouch_contact_memo !== undefined) setRetouchMemo(patch.retouch_contact_memo) }} customerName={customer?.name} customerPhone={customer?.phone} emails={emails} onEmailAdd={addEmail} onEmailUpdate={updateEmail} onEmailDelete={deleteEmail} />}
        {currentStep === 6 && <Step6Notice notice={selectedPackage?.notice || null} />}
        {currentStep === 7 && (<div><Step7Payment customerName={customer?.name || ''} shootDate={schedule?.shoot_date || ''} packageInfo={selectedPackage} peopleCount={peopleCount} basePrice={basePrice} lines={lines} items={items} discount={discount} onDiscountChange={setDiscount} depositAmount={depositAmount} payments={payments} onPaymentAdd={addPayment} onPaymentUpdate={updatePayment} onPaymentDelete={deletePayment} /><div className="max-w-3xl mx-auto px-8 pb-8 flex gap-3"><button onClick={() => handleSave('draft')} disabled={saving} className="flex-1 py-3 border border-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 cursor-pointer disabled:opacity-50">작성중 저장</button><button onClick={() => handleSave('confirmed')} disabled={saving} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-800 cursor-pointer disabled:opacity-50">{saving ? '저장 중...' : '확정 저장'}</button></div></div>)}
      </div>
    </MainLayout>
  )
}

function fmtPrice(n: number) { return new Intl.NumberFormat('ko-KR').format(n) }