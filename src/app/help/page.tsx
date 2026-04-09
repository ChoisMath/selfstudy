"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import Image from "next/image";

const TOC = [
  {
    id: "install",
    title: "설치 / 로그인",
    items: [
      { id: "install-android", title: "앱 설치 (안드로이드)" },
      { id: "install-ios", title: "앱 설치 (iOS)" },
      { id: "login", title: "로그인 방법" },
      { id: "password", title: "비밀번호 변경" },
    ],
  },
  {
    id: "supervisor",
    title: "감독교사",
    items: [
      { id: "attendance-check", title: "출석 체크 방법" },
      { id: "absence-approve", title: "불참신청 승인" },
      { id: "supervisor-change", title: "감독교사 변경" },
    ],
  },
  {
    id: "homeroom",
    title: "담임교사",
    items: [
      { id: "weekly-attendance", title: "주간 출결 확인" },
      { id: "monthly-attendance", title: "월간 출결 / Excel / 시수누계" },
      { id: "participation-manage", title: "참여학생 관리" },
      { id: "absence-reason", title: "불참사유 등록" },
      { id: "homeroom-absence-approve", title: "불참신청 승인" },
      { id: "homeroom-schedule", title: "감독일정 변경" },
    ],
  },
  {
    id: "grade-admin",
    title: "학년관리",
    items: [
      { id: "today-dashboard", title: "오늘출결 대시보드" },
      { id: "student-manage", title: "학생관리" },
      { id: "participation-setting", title: "참여설정" },
      { id: "seating", title: "좌석배치" },
      { id: "supervisor-assign", title: "감독배정" },
      { id: "grade-monthly", title: "월간출결 / Excel 다운로드" },
    ],
  },
];

function SectionHeader({
  id,
  title,
  refFn,
}: {
  id: string;
  title: string;
  refFn: (el: HTMLElement | null) => void;
}) {
  return (
    <div ref={refFn} id={id} className="scroll-mt-16">
      <div className="bg-[#eff6ff] border-l-[3px] border-[#2563eb] px-4 py-3 rounded-r-lg mb-4">
        <h2 className="font-bold text-[#1e40af] text-base">{title}</h2>
      </div>
    </div>
  );
}

function SubHeader({
  id,
  title,
  refFn,
}: {
  id: string;
  title: string;
  refFn: (el: HTMLElement | null) => void;
}) {
  return (
    <h3
      ref={refFn}
      id={id}
      className="scroll-mt-16 font-semibold text-[#111827] text-sm mt-6 mb-3"
    >
      {title}
    </h3>
  );
}

function StepItem({
  num,
  children,
}: {
  num: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 mb-2">
      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#dbeafe] text-[#1e40af] text-xs flex items-center justify-center font-semibold">
        {num}
      </span>
      <span className="text-sm text-[#374151] leading-relaxed">{children}</span>
    </div>
  );
}

function ColorChip({ color, label }: { color: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 mr-3 mb-1">
      <span className="w-4 h-4 rounded" style={{ backgroundColor: color }} />
      <span className="text-sm text-[#374151]">{label}</span>
    </span>
  );
}

export default function HelpPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  const setRef = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      sectionRefs.current[id] = el;
    },
    []
  );

  const scrollTo = useCallback((id: string) => {
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
    setSidebarOpen(false);
  }, []);

  const isInGroup = useCallback(
    (groupId: string) => {
      const group = TOC.find((g) => g.id === groupId);
      if (!group) return false;
      return (
        activeSection === groupId ||
        group.items.some((item) => item.id === activeSection)
      );
    },
    [activeSection]
  );

  useEffect(() => {
    const allIds: string[] = [];
    TOC.forEach((group) => {
      allIds.push(group.id);
      group.items.forEach((item) => allIds.push(item.id));
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { rootMargin: "-80px 0px -60% 0px" }
    );

    allIds.forEach((id) => {
      const el = sectionRefs.current[id];
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-[#f9fafb]">
      {/* Fixed Header */}
      <header className="fixed top-0 left-0 right-0 z-50 h-14 bg-[#1e40af] flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image src="/posan.svg" alt="logo" width={28} height={28} />
          <span className="text-white font-bold text-sm">포산고 자율학습 안내</span>
        </div>
        <button
          onClick={() => setSidebarOpen((prev) => !prev)}
          className="text-white p-1"
          aria-label="목차 열기"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 6h16M4 12h16M4 18h16"
            />
          </svg>
        </button>
      </header>

      {/* Overlay dim */}
      {sidebarOpen && (
        <div
          className="fixed inset-x-0 bottom-0 bg-black/30 z-40"
          style={{ top: "3.5rem" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <nav
        className={`fixed top-14 right-0 bottom-0 z-50 w-[280px] bg-white shadow-xl overflow-y-auto transition-transform duration-300 ${
          sidebarOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-4">
          <p className="text-xs font-semibold text-[#6b7280] uppercase tracking-wider mb-3">
            목차
          </p>
          {TOC.map((group) => (
            <div key={group.id} className="mb-4">
              <button
                onClick={() => scrollTo(group.id)}
                className={`w-full text-left text-sm font-semibold px-2 py-1.5 rounded transition-colors ${
                  isInGroup(group.id)
                    ? "text-[#1e40af] bg-[#eff6ff]"
                    : "text-[#111827] hover:bg-[#f9fafb]"
                }`}
              >
                {group.title}
              </button>
              <div className="ml-3 mt-1 space-y-0.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => scrollTo(item.id)}
                    className={`w-full text-left text-xs px-2 py-1 rounded transition-colors ${
                      activeSection === item.id
                        ? "text-[#2563eb] bg-[#dbeafe]"
                        : "text-[#6b7280] hover:bg-[#f9fafb]"
                    }`}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-14 px-4 pb-16 max-w-2xl mx-auto">
        {/* ─── Section 1: 설치 / 로그인 ─── */}
        <SectionHeader
          id="install"
          title="📱 설치 / 로그인"
          refFn={setRef("install")}
        />

        <SubHeader
          id="install-android"
          title="앱 설치 (안드로이드)"
          refFn={setRef("install-android")}
        />
        <p className="text-sm text-[#374151] mb-3">
          갤럭시 등 안드로이드 기종은 Chrome 브라우저를 사용합니다.
        </p>
        <StepItem num={1}>Chrome 열기</StepItem>
        <StepItem num={2}>주소창에 posan.up.railway.app 입력</StepItem>
        <StepItem num={3}>우측 상단 점 3개(⋮) 클릭</StepItem>
        <StepItem num={4}>홈 화면에 추가 → 설치</StepItem>
        <StepItem num={5}>1~2분 후 홈 화면에 앱 아이콘이 생성됩니다.</StepItem>

        <SubHeader
          id="install-ios"
          title="앱 설치 (iOS / 아이폰)"
          refFn={setRef("install-ios")}
        />
        <p className="text-sm text-[#374151] mb-3">
          아이폰, 아이패드는 Safari 브라우저를 사용합니다.
        </p>
        <StepItem num={1}>Safari 열기</StepItem>
        <StepItem num={2}>주소창에 posan.up.railway.app 입력</StepItem>
        <StepItem num={3}>하단 공유 아이콘(⎋) 클릭</StepItem>
        <StepItem num={4}>홈 화면에 추가 → 추가</StepItem>
        <StepItem num={5}>1~2분 후 홈 화면에 앱 아이콘이 생성됩니다.</StepItem>

        <SubHeader
          id="login"
          title="로그인 방법"
          refFn={setRef("login")}
        />
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 mb-2">
          <div className="mb-3">
            <p className="text-sm font-semibold text-[#111827] mb-1">교사 로그인</p>
            <p className="text-sm text-[#374151]">
              ID: 개인 NEIS 아이디 / PW: 초기 비밀번호 1234
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-[#111827] mb-1">학생 로그인</p>
            <p className="text-sm text-[#374151]">
              이름 + 학번 5자리 (예: 김서현 / 10101)
            </p>
          </div>
        </div>

        <SubHeader
          id="password"
          title="비밀번호 변경"
          refFn={setRef("password")}
        />
        <p className="text-sm text-[#374151] mb-2">
          로그인 후 우측 상단의 &quot;담임교사&quot; 또는 &quot;감독&quot; 버튼을 통해 이동합니다.
        </p>
        <p className="text-sm text-[#374151] mb-2">설정 메뉴에서 비밀번호를 변경할 수 있습니다.</p>
        <p className="text-sm text-[#6b7280]">※ 문의 사항은 관리자에게 연락하세요.</p>

        <hr className="my-8 border-[#e5e7eb]" />

        {/* ─── Section 2: 감독교사 ─── */}
        <SectionHeader
          id="supervisor"
          title="✅ 감독교사"
          refFn={setRef("supervisor")}
        />

        <SubHeader
          id="attendance-check"
          title="출석 체크 방법"
          refFn={setRef("attendance-check")}
        />
        <p className="text-sm text-[#374151] mb-3">
          출석부 화면에서 학생 좌석을 터치하여 출결 상태를 변경합니다.
        </p>
        <div className="bg-white border border-[#e5e7eb] rounded-lg p-4 mb-3">
          <div className="flex flex-wrap">
            <ColorChip color="#22c55e" label="출석 (1번 터치)" />
            <ColorChip color="#f472b6" label="결석 (2번 터치)" />
            <ColorChip color="#3b82f6" label="미체크 (초기 상태)" />
          </div>
        </div>
        <p className="text-sm text-[#d97706] bg-[#fffbeb] border border-[#fde68a] rounded px-3 py-2">
          ⚠ 감독 종료 전, 파란색(미체크) 좌석이 없는지 반드시 확인해 주세요.
        </p>

        <SubHeader
          id="absence-approve"
          title="불참신청 승인"
          refFn={setRef("absence-approve")}
        />
        <p className="text-sm text-[#374151] mb-2">
          출석부 화면의 &quot;불참신청&quot; 탭을 선택합니다.
        </p>
        <p className="text-sm text-[#374151]">
          학생들의 신청 내역을 확인하고 승인 또는 거절 처리합니다.
        </p>

        <SubHeader
          id="supervisor-change"
          title="감독교사 변경"
          refFn={setRef("supervisor-change")}
        />
        <p className="text-sm text-[#374151] mb-2">
          감독일정 화면에서 자신의 감독 일정을 확인할 수 있습니다.
        </p>
        <p className="text-sm text-[#374151]">
          변경이 필요한 경우 교체 요청을 할 수 있습니다.
        </p>

        <hr className="my-8 border-[#e5e7eb]" />

        {/* ─── Section 3: 담임교사 ─── */}
        <SectionHeader
          id="homeroom"
          title="👨‍🏫 담임교사"
          refFn={setRef("homeroom")}
        />

        <SubHeader
          id="weekly-attendance"
          title="주간 출결 확인"
          refFn={setRef("weekly-attendance")}
        />
        <p className="text-sm text-[#374151] mb-2">
          담임 메인 화면에서 자기 반 학생들의 주간 출결 현황을 확인합니다.
        </p>
        <p className="text-sm text-[#374151]">
          각 출결 셀에 호버링(터치) 하면 출결 기록의 사유를 점검할 수 있습니다.
        </p>

        <SubHeader
          id="monthly-attendance"
          title="월간 출결 / Excel 다운로드 / 시수누계"
          refFn={setRef("monthly-attendance")}
        />
        <p className="text-sm text-[#374151] mb-2">
          월간출결 탭에서 월별 출결 통계를 확인합니다.
        </p>
        <p className="text-sm text-[#374151] mb-2">
          Excel 다운로드 버튼으로 출결 데이터를 파일로 내려받을 수 있습니다.
        </p>
        <p className="text-sm text-[#374151]">
          시수누계(시간) 컬럼으로 학생별 참여시간을 검토합니다.
        </p>

        <SubHeader
          id="participation-manage"
          title="참여학생 관리"
          refFn={setRef("participation-manage")}
        />
        <p className="text-sm text-[#374151]">
          참여설정 탭에서 자기 반 학생의 자율학습 참여 여부를 관리합니다.
        </p>

        <SubHeader
          id="absence-reason"
          title="불참사유 등록"
          refFn={setRef("absence-reason")}
        />
        <p className="text-sm text-[#374151]">
          불참사유 탭에서 학생별 불참 사유를 등록합니다.
        </p>

        <SubHeader
          id="homeroom-absence-approve"
          title="불참신청 승인"
          refFn={setRef("homeroom-absence-approve")}
        />
        <p className="text-sm text-[#374151]">
          불참신청 탭에서 학생들의 신청을 확인하고 승인 또는 거절합니다.
        </p>

        <SubHeader
          id="homeroom-schedule"
          title="감독일정 변경"
          refFn={setRef("homeroom-schedule")}
        />
        <p className="text-sm text-[#374151]">
          감독일정 탭에서 자신의 감독 일정을 확인하고 교체 요청을 할 수 있습니다.
        </p>

        <hr className="my-8 border-[#e5e7eb]" />

        {/* ─── Section 4: 학년관리 ─── */}
        <SectionHeader
          id="grade-admin"
          title="⚙️ 학년관리"
          refFn={setRef("grade-admin")}
        />

        <SubHeader
          id="today-dashboard"
          title="오늘출결 대시보드"
          refFn={setRef("today-dashboard")}
        />
        <p className="text-sm text-[#374151]">
          메인 페이지의 오늘출결 탭에서 해당 학년 전체의 실시간 출결 현황을 확인합니다.
        </p>

        <SubHeader
          id="student-manage"
          title="학생관리"
          refFn={setRef("student-manage")}
        />
        <p className="text-sm text-[#374151] mb-2">
          학생관리 탭에서 학생 사용자를 등록하고 수정합니다.
        </p>
        <p className="text-sm text-[#374151]">
          도우미 학생을 선정할 수 있습니다. 도우미는 불참신청을 일괄 등록할 수 있는 권한을 가집니다.
        </p>

        <SubHeader
          id="participation-setting"
          title="참여설정"
          refFn={setRef("participation-setting")}
        />
        <p className="text-sm text-[#374151]">
          참여설정 탭에서 학년 전체에 대한 자율학습 참여 설정을 관리합니다.
        </p>

        <SubHeader
          id="seating"
          title="좌석배치"
          refFn={setRef("seating")}
        />
        <p className="text-sm text-[#374151]">
          좌석배치 탭에서 드래그 앤 드롭으로 학생들의 좌석을 배치합니다.
        </p>

        <SubHeader
          id="supervisor-assign"
          title="감독배정"
          refFn={setRef("supervisor-assign")}
        />
        <p className="text-sm text-[#374151]">
          월간 캘린더에서 각 날짜에 감독교사를 배정합니다.
        </p>

        <SubHeader
          id="grade-monthly"
          title="월간출결 / Excel 다운로드"
          refFn={setRef("grade-monthly")}
        />
        <p className="text-sm text-[#374151] mb-2">
          월간출결 탭에서 학년 전체 출석 데이터를 조회합니다.
        </p>
        <p className="text-sm text-[#374151]">
          Excel 다운로드 버튼으로 데이터를 내려받을 수 있습니다.
        </p>
      </main>
    </div>
  );
}
