import type { GalleryEntry } from "./types";
import { LoginMock } from "../LoginMock";
import { PHONE_BODY } from "../layout";
import { ME, STUDENTS } from "../data";

const pad2 = (n: number) => String(n).padStart(2, "0");

const hajunseo = STUDENTS.find((s) => s.name === "하준서");
if (!hajunseo) throw new Error("STUDENTS에 하준서가 없음 — data.ts 확인");
// 학년(1자리) + 반(2자리) + 번호(2자리) — login/page.tsx 133-148행 학번 형식.
const studentCode = `${hajunseo.grade}${pad2(hajunseo.classNumber)}${pad2(hajunseo.number)}`;

export const ENTRIES: GalleryEntry[] = [
  {
    id: "Login-Teacher",
    width: PHONE_BODY.w,
    height: PHONE_BODY.h,
    component: () => (
      <LoginMock
        width={PHONE_BODY.w}
        height={PHONE_BODY.h}
        tab="teacher"
        fields={{ first: { text: ME.loginId }, second: { text: "1234", masked: true } }}
      />
    ),
  },
  {
    id: "Login-Student",
    width: PHONE_BODY.w,
    height: PHONE_BODY.h,
    component: () => (
      <LoginMock
        width={PHONE_BODY.w}
        height={PHONE_BODY.h}
        tab="student"
        fields={{ first: { text: hajunseo.name }, second: { text: studentCode } }}
      />
    ),
  },
];
