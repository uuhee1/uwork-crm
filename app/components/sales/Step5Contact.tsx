'use client'

import { useState } from 'react'

type Props = {
  retouchName: string
  retouchPhone: string
  retouchMemo: string
  onRetouchChange: (patch: { retouch_contact_name?: string; retouch_contact_phone?: string; retouch_contact_memo?: string }) => void
  customerName?: string
  customerPhone?: string | null

  emails: { _tmp_id: string; email: string }[]
  onEmailAdd: () => void
  onEmailUpdate: (tmpId: string, email: string) => void
  onEmailDelete: (tmpId: string) => void
}

export default function Step5Contact({
  retouchName,
  retouchPhone,
  retouchMemo,
  onRetouchChange,
  customerName,
  customerPhone,
  emails,
  onEmailAdd,
  onEmailUpdate,
  onEmailDelete,
}: Props) {
  const [sameAsReserver, setSameAsReserver] = useState(false)

  function toggleSameAsReserver(v: boolean) {
    setSameAsReserver(v)
    if (v) {
      onRetouchChange({
        retouch_contact_name: customerName || '',
        retouch_contact_phone: customerPhone || '',
      })
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-10">
      {/* 보정본 확인 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-5 text-center">보정본 확인</h2>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-3">
          <div className="flex gap-2">
            <input
              type="text"
              value={retouchName}
              onChange={e => { onRetouchChange({ retouch_contact_name: e.target.value }); setSameAsReserver(false) }}
              placeholder="보정본 확인 담당자"
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
            />
            <label className="flex items-center gap-1 px-3 py-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={sameAsReserver}
                onChange={e => toggleSameAsReserver(e.target.checked)}
                className="w-4 h-4 cursor-pointer"
              />
              예약자와 동일
            </label>
          </div>

          <input
            type="tel"
            value={retouchPhone}
            onChange={e => { onRetouchChange({ retouch_contact_phone: e.target.value }); setSameAsReserver(false) }}
            placeholder="연락처"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
          />

          <input
            type="text"
            value={retouchMemo}
            onChange={e => onRetouchChange({ retouch_contact_memo: e.target.value })}
            placeholder="메모 (카톡 등록, 연락가능시간 등)"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
          />
        </div>
      </div>

      {/* 원본파일 */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-5 text-center">원본파일 전송</h2>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-2">
          {emails.length === 0 && (
            <p className="text-center text-sm text-gray-400 py-2">
              이메일을 추가하세요
            </p>
          )}
          {emails.map((e, idx) => (
            <div key={e._tmp_id} className="flex gap-2">
              <input
                type="email"
                value={e.email}
                onChange={ev => onEmailUpdate(e._tmp_id, ev.target.value)}
                placeholder="example@domain.com"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400"
              />
              {idx === emails.length - 1 && (
                <button
                  onClick={onEmailAdd}
                  className="w-10 h-10 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 cursor-pointer text-lg"
                  title="추가"
                >
                  +
                </button>
              )}
              <button
                onClick={() => onEmailDelete(e._tmp_id)}
                className="w-10 h-10 rounded-lg bg-gray-100 text-gray-400 hover:bg-red-100 hover:text-red-500 cursor-pointer text-lg"
                title="삭제"
              >
                −
              </button>
            </div>
          ))}
          {emails.length === 0 && (
            <button
              onClick={onEmailAdd}
              className="w-full py-2 border border-dashed border-gray-200 rounded-lg text-sm text-gray-500 hover:border-gray-400 cursor-pointer"
            >
              + 이메일 추가
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
