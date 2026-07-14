/** Tailwind `lg` 미만 — 모바일·태블릿 세로 레이아웃 */
export const MOBILE_LAYOUT_MQ = "(max-width: 1023px)";

export function isMobileLayout(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia(MOBILE_LAYOUT_MQ).matches;
}

/** 폼 열 때 스크롤 — 모바일은 smooth·autofocus 생략해 흔들림·키보드 점프 방지 */
export function scrollFormIntoView(
  element: HTMLElement | null | undefined,
  options?: { focusSelector?: string }
): void {
  if (!element) return;
  const mobile = isMobileLayout();
  requestAnimationFrame(() => {
    element.scrollIntoView({
      behavior: mobile ? "auto" : "smooth",
      block: mobile ? "nearest" : "start",
    });
    if (!mobile && options?.focusSelector) {
      document.querySelector<HTMLElement>(options.focusSelector)?.focus({ preventScroll: true });
    }
  });
}
