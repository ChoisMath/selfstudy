# v4 비판적 검토 성찰 결과

## Critical 해결 방안

### C1. AbsenceRequest 승인 → Attendance/AbsenceReason 연동
승인 API (`PUT /api/homeroom/absence-requests/:id`) 트랜잭션:
1. `AbsenceRequest.status` → `approved`, `reviewedBy` = 교사ID, `reviewedAt` = now
2. `Attendance` upsert: `studentId` + `sessionType` + `date` → `status: absent`
3. `AbsenceReason` create: `attendanceId`, `reasonType`/`detail` = 신청 내용, `registeredBy` = 승인 교사
- 반려: `AbsenceRequest.status` → `rejected`, Attendance 변경 없음
- 승인 후 번복: MVP에서 미지원 (관리자가 수동으로 Attendance 수정)

### C2. 서브관리자 학년 파라미터 검증
Phase 0 RBAC 미들웨어에 `withGradeAuth` 추가:
```typescript
// grade-admin 라우트 미들웨어
async function withGradeAuth(req, grade) {
  const session = await getServerSession();
  if (session.user.roles.includes('admin')) return true; // 메인관리자는 모든 학년 OK
  const assignment = await prisma.subAdminAssignment.findFirst({
    where: { teacherId: session.user.id, grade: parseInt(grade) }
  });
  if (!assignment) throw new ForbiddenError();
}
```

### C3. NextAuth.js 이중 Credentials Provider
```typescript
// auth.ts
providers: [
  CredentialsProvider({
    id: "teacher-credentials",
    authorize: async (credentials) => {
      const teacher = await prisma.teacher.findUnique({ where: { loginId: credentials.id } });
      if (!teacher || !await bcrypt.compare(credentials.password, teacher.passwordHash)) return null;
      return { id: teacher.id, type: "teacher", name: teacher.name, roles: [...] };
    }
  }),
  CredentialsProvider({
    id: "student-credentials", 
    authorize: async (credentials) => {
      // 이름 + 학번으로 검색
      const students = await prisma.student.findMany({ where: { name: credentials.name } });
      const student = students.find(s => 
        s.grade * 10000 + s.classNumber * 100 + s.studentNumber === parseInt(credentials.studentCode)
      );
      if (!student) return null;
      return { id: student.id, type: "student", name: student.name, grade: student.grade };
    }
  }),
  GoogleProvider({ ... })
],
callbacks: {
  jwt: ({ token, user }) => {
    if (user) { token.userType = user.type; token.userId = user.id; token.roles = user.roles; }
    return token;
  },
  session: ({ session, token }) => {
    session.user.type = token.userType;
    session.user.id = token.userId;
    session.user.roles = token.roles;
    return session;
  }
}
```

## Warning 해결 방안

### W1. sub_admin 단일 소스
- `enum Role`에서 `sub_admin` 제거
- 서브관리자 판별: `SubAdminAssignment` 테이블 존재 여부로 확인
- 미들웨어에서 교사 세션 로딩 시 SubAdminAssignment도 함께 조회

### W2. 동명이인 처리 통일
- 이름(ID) + 학번(PW)으로 유일 식별 (학년/반 선택 화면 불필요)
- 5절의 동명이인 설명을 "학번으로 유일 식별, 추가 선택 불필요"로 수정

### W3. Attendance 생성 시점
- 감독교사 좌석 탭 시: upsert (없으면 생성, 있으면 상태 변경)
- 불참 승인 시: 동일한 upsert 로직
- 배치 일괄생성은 MVP에서 불필요

### W4. 학생 로그인 보안
- 계획에 명시: "학생 인증은 편의성 우선. 학번이 사실상 공개정보이므로 보안 수준 낮음 (허용)"
- 학생에도 rate limiting: 10회 실패 시 5분 잠금
- 학생 세션 만료: 2시간

### W5. 감독교체 동의
- 계획에 명시: "교체는 당사자 간 사전 합의를 전제, 시스템은 기록 목적"
- 피교체자: 다음 로그인 시 "감독 일정이 변경되었습니다" 배너 표시

### W6-W7. 코드 재사용 + Phase 통합
- Phase 1 + 1.5 통합: 학년별 컴포넌트를 `components/admin-shared/`로 추출
- API: `/api/grade-admin/[grade]/*`로 통합, 메인관리자는 모든 grade 접근 가능
- 메인관리자 전용 기능만 `/api/admin/*`에 별도 유지

### W8. 네비게이션
- 모바일: 하단 탭 바 (3~4개 주요 메뉴) + 햄버거 메뉴 (보조 기능)
- 역할별 주 메뉴: 오늘 감독이면 "출석체크" 메인, 아니면 역할에 따라 결정
