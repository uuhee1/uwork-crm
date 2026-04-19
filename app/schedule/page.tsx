'use client'

import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import MainLayout from '@/app/components/MainLayout'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import interactionPlugin from '@fullcalendar/interaction'
import type { EventClickArg } from '@fullcalendar/core'
import ScheduleModal from '@/app/components/ScheduleModal'

type CalendarEvent = {
  id: string
  title: string
  start: string
  end: string
  backgroundColor: string
  borderColor: string
  extendedProps: {
    scheduleId: string
    customerId: string
    customerName: string
    shootType: string
    peopleCount: number
    status: string
    depositStatus: string
    memo: string | null
    staffName: string | null
  }
}

const COLOR_MAP: Record<string, string> = {
  BANANA: '#F6BF26',
  TOMATO: '#D50000',
  SAGE: '#33B679',
  PEACOCK: '#039BE5',
  LAVENDER: '#7986CB',
  GRAPHITE: '#616161',
  TANGERINE: '#F4511E',
  FLAMINGO: '#E67C73',
}

const STATUS_LABEL: Record<string, string> = {
  wait: '확정대기',
  confirmed: '확정',
  canceled: '취소',
  noshow: '노쇼',
}

const DEPOSIT_LABEL: Record<string, string> = {
  pending: '입금대기',
  paid: '입금완료',
  nodeposit: '면제',
  refunded: '환불완료',
}

export default function SchedulePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null)
  const [showModal, setShowModal] = useState(false)
  const calendarRef = useRef<FullCalendar>(null)

  useEffect(() => {
    loadSchedules()
  }, [])

  async function loadSchedules() {
    const { data, error } = await supabase
      .from('schedules')
      .select(`
        *,
        customers ( name ),
        shoot_types ( label, cal_color ),
        staff ( name )
      `)
      .order('shoot_date', { ascending: true })

    if (error || !data) return

    const mapped: CalendarEvent[] = data.map(s => {
      const color = COLOR_MAP[s.shoot_types?.cal_color || ''] || '#4285F4'
      const custName = s.customers?.name || '-'
      const typeLabel = s.shoot_types?.label || '-'

      return {
        id: s.id,
        title: `[${typeLabel}] ${custName} ${s.people_count}인`,
        start: `${s.shoot_date}T${s.start_at}`,
        end: `${s.shoot_date}T${s.end_at}`,
        backgroundColor: s.status === 'canceled' || s.status === 'noshow' ? '#9CA3AF' : color,
        borderColor: s.status === 'canceled' || s.status === 'noshow' ? '#9CA3AF' : color,
        extendedProps: {
          scheduleId: s.id,
          customerId: s.customer_id,
          customerName: custName,
          shootType: typeLabel,
          peopleCount: s.people_count,
          status: s.status,
          depositStatus: s.deposit_status,
          memo: s.memo,
          staffName: s.staff?.name || null,
        },
      }
    })

    setEvents(mapped)
  }

  function handleEventClick(info: EventClickArg) {
    const ev = events.find(e => e.id === info.event.id)
    if (ev) {
      setSelectedEvent(ev)
      setShowModal(true)
    }
  }

  return (
    <MainLayout>
      <div className="p-4 bg-white min-h-[calc(100vh-52px)]">
        <style>{`
          .fc {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Arial, sans-serif;
            font-size: 13px;
          }
          .fc .fc-toolbar-title {
            font-size: 1.2rem;
            font-weight: 700;
          }
          .fc .fc-button {
            font-size: 0.8rem;
            padding: 4px 12px;
            border-radius: 8px;
          }
          .fc .fc-button-primary {
            background-color: #111827;
            border-color: #111827;
          }
          .fc .fc-button-primary:not(:disabled).fc-button-active,
          .fc .fc-button-primary:not(:disabled):active {
            background-color: #374151;
            border-color: #374151;
          }
          .fc .fc-event {
            border-radius: 4px;
            padding: 1px 4px;
            font-size: 0.75rem;
            cursor: pointer;
          }
          .fc .fc-daygrid-event {
            white-space: nowrap;
            overflow: hidden;
          }
          .fc td, .fc th {
            border-color: #E5E7EB;
          }
          .fc .fc-day-today {
            background-color: #F0F9FF !important;
          }
          .fc .fc-col-header-cell {
            padding: 8px 0;
            font-weight: 600;
            color: #374151;
          }
        `}</style>

        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale="ko"
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'listWeek,dayGridMonth,timeGridWeek,timeGridDay',
          }}
          buttonText={{
            today: '오늘',
            month: '월',
            week: '주',
            day: '일',
            list: '목록',
          }}
          events={events}
          eventClick={handleEventClick}
          height="calc(100vh - 120px)"
          dayMaxEvents={4}
          nowIndicator={true}
          slotMinTime="08:00:00"
          slotMaxTime="21:00:00"
          allDaySlot={false}
          slotLabelFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
          eventTimeFormat={{
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          }}
        />

        {showModal && selectedEvent && (
          <ScheduleModal
            event={selectedEvent}
            statusLabel={STATUS_LABEL}
            depositLabel={DEPOSIT_LABEL}
            onClose={() => setShowModal(false)}
          />
        )}
      </div>
    </MainLayout>
  )
}