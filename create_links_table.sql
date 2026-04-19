-- links 테이블 생성 (Supabase SQL Editor에서 실행)
CREATE TABLE IF NOT EXISTS links (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category TEXT NOT NULL DEFAULT '기타',
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_important BOOLEAN DEFAULT false,
  created_by UUID REFERENCES staff(id),
  updated_by UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS 활성화
ALTER TABLE links ENABLE ROW LEVEL SECURITY;

-- 인증된 사용자 전체 접근 허용 (내부 직원용)
CREATE POLICY "Authenticated users can do everything on links"
  ON links
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
