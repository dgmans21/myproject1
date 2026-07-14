export type PageMeta = {
  title: string;
  description?: string;
};

export function getPageMeta(pathname: string): PageMeta {
  if (pathname.startsWith("/admin/visits")) {
    return { title: "방문 조회", description: "User-Agent · IP 조회 (관리자)" };
  }
  if (pathname.startsWith("/visitors")) {
    return { title: "오늘의 방문", description: "조용히, 오늘 하루만" };
  }
  if (pathname.startsWith("/meetings/memories")) {
    return { title: "만남 추억록", description: "확정된 만남 · 가볍게 남기기" };
  }
  if (/^\/groups\/[^/]+\/appointments\/[^/]+/.test(pathname)) {
    return { title: "약속 투표", description: "날짜 · 시간 · 장소 확정" };
  }
  if (/^\/groups\/[^/]+/.test(pathname)) {
    return { title: "방 상세", description: "멤버 · 약속 · 일정" };
  }
  if (pathname.startsWith("/places/map")) {
    return { title: "맛집 지도", description: "지도에서 맛집 탐색" };
  }
  if (pathname.startsWith("/places")) {
    return { title: "맛집", description: "등급 · 평가 · 리뷰" };
  }
  if (pathname.startsWith("/groups")) {
    return { title: "방", description: "모임방 목록 · 생성" };
  }
  if (pathname.startsWith("/ranking")) {
    return { title: "신뢰도 랭킹", description: "칭호 · 신뢰도 순위" };
  }
  if (pathname.startsWith("/friends")) {
    return { title: "친구 관리", description: "방 초대용 친구 목록" };
  }
  if (pathname.startsWith("/profile")) {
    return { title: "마이페이지", description: "프로필 · 칭호 · 잔디" };
  }
  if (pathname.startsWith("/dashboard")) {
    return { title: "대시보드", description: "약속 관리를 시작해보세요" };
  }
  return { title: "우리지금만나" };
}
