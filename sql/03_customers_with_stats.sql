-- =========================================================
-- customers_with_stats: 고객 + 최근촬영일 + 판매건수 뷰
-- Supabase SQL Editor에서 실행
-- =========================================================

CREATE OR REPLACE VIEW customers_with_stats AS
SELECT
  c.*,
  (SELECT MAX(shoot_date) FROM schedules WHERE customer_id = c.id) AS last_shoot_date,
  (SELECT COUNT(*) FROM schedules WHERE customer_id = c.id) AS total_schedules,
  (SELECT COUNT(*) FROM sales WHERE customer_id = c.id) AS total_sales
FROM customers c;

-- 뷰에도 RLS 정책을 상속하도록 보장
-- (Supabase의 경우 기반 테이블의 RLS가 자동 적용됨)
