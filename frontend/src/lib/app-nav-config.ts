export type AppNavLink = {
  href: string;
  label: string;
};

export type AppNavSection = {
  title: string;
  links: AppNavLink[];
};

export function getNavSection(pathname: string, isAdmin = false): AppNavSection {
  if (pathname.startsWith("/admin")) {
    return {
      title: "관리",
      links: [
        { href: "/admin/visits", label: "방문 조회" },
        { href: "/visitors", label: "오늘의 방문" },
      ],
    };
  }
  if (pathname.startsWith("/visitors")) {
    return {
      title: "방문",
      links: [
        { href: "/visitors", label: "오늘의 방문" },
        { href: "/meetings/memories", label: "만남 추억록" },
      ],
    };
  }
  if (pathname.startsWith("/meetings")) {
    return {
      title: "만남",
      links: [
        { href: "/meetings/memories", label: "만남 추억록" },
        { href: "/groups", label: "방 · 약속" },
      ],
    };
  }
  if (/^\/groups\/[^/]+\/appointments\//.test(pathname)) {
    const roomId = pathname.split("/")[2];
    return {
      title: "약속",
      links: [
        { href: `/groups/${roomId}`, label: "← 방으로" },
        { href: pathname, label: "투표 · 브리핑" },
      ],
    };
  }
  if (/^\/groups\/[^/]+/.test(pathname)) {
    return {
      title: "방",
      links: [
        { href: "/groups", label: "← 방 목록" },
        { href: pathname, label: "방 상세" },
      ],
    };
  }
  if (pathname.startsWith("/places/map")) {
    return {
      title: "맛집",
      links: [
        { href: "/places", label: "맛집 목록" },
        { href: "/places/map", label: "맛집 지도" },
      ],
    };
  }
  if (pathname.startsWith("/places")) {
    return {
      title: "맛집",
      links: [
        { href: "/places", label: "맛집 목록" },
        { href: "/places/map", label: "맛집 지도" },
      ],
    };
  }
  if (pathname.startsWith("/groups")) {
    return {
      title: "방",
      links: [
        { href: "/groups", label: "방 목록" },
        { href: "/groups?create=1", label: "방 만들기" },
      ],
    };
  }
  if (pathname.startsWith("/ranking")) {
    return {
      title: "랭킹",
      links: [{ href: "/ranking", label: "신뢰도 랭킹" }],
    };
  }
  if (pathname.startsWith("/friends")) {
    return {
      title: "계정",
      links: [
        { href: "/profile", label: "마이페이지" },
        { href: "/friends", label: "친구 관리" },
      ],
    };
  }
  if (pathname.startsWith("/profile")) {
    const links: AppNavLink[] = [
      { href: "/profile", label: "마이페이지" },
      { href: "/friends", label: "친구 관리" },
    ];
    if (isAdmin) {
      links.push({ href: "/admin/visits", label: "방문 조회 (관리자)" });
    }
    return { title: "계정", links };
  }
  return {
    title: "시작",
    links: [
      { href: "/dashboard", label: "대시보드" },
      { href: "/meetings/memories", label: "만남 추억록" },
      { href: "/visitors", label: "오늘의 방문" },
      { href: "/groups", label: "방" },
      { href: "/places", label: "맛집" },
    ],
  };
}

export const APP_ICON_NAV = [
  { href: "/dashboard", label: "대시보드", short: "홈" },
  { href: "/groups", label: "방", short: "방" },
  { href: "/places", label: "맛집", short: "맛" },
  { href: "/ranking", label: "랭킹", short: "순" },
  { href: "/profile", label: "마이페이지", short: "나" },
] as const;
