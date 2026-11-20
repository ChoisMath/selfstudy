-- 오후 자율학습이 야간 자율학습 좌석 배치를 함께 쓰는지 여부 (오후 세션 행에서만 사용)
ALTER TABLE "study_sessions" ADD COLUMN "shares_night_layout" BOOLEAN NOT NULL DEFAULT false;
