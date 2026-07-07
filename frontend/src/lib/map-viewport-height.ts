/**
 * 지도 뷰포트 높이 계산 (AppShell·페이지 chrome Tailwind 클래스 기준)
 *
 * AppContentHeader: h-14 → 56px
 * @see frontend/src/components/layout/AppContentHeader.tsx
 */

/** AppContentHeader `h-14` (3.5rem) */
export const APP_CONTENT_HEADER_HEIGHT_PX = 56;

export const MAP_HEIGHT_MIN_PX = 280;
export const MAP_HEIGHT_MAX_PX = 720;

/** places/map: `py-6` padding-top 24px */
const PLACES_MAP_PAGE_PADDING_TOP_PX = 24;

/** places/map: back link `text-sm` (~20px) + `mb-4` (16px) */
const PLACES_MAP_BACK_LINK_PX = 36;

/** places/map: description `text-sm` (~20px) + `mb-6` (24px) */
const PLACES_MAP_DESCRIPTION_PX = 44;

/** places/map: 페이지 상단 chrome (지도 위 고정 영역) */
export const PLACES_MAP_PAGE_TOP_CHROME_PX =
  PLACES_MAP_PAGE_PADDING_TOP_PX + PLACES_MAP_BACK_LINK_PX + PLACES_MAP_DESCRIPTION_PX;

/** places/map: 선택 장소 Card `mt-6` (24px) + Card 본문 최소 높이 (~176px) */
export const PLACES_MAP_SELECTED_CARD_RESERVE_PX = 200;

/**
 * PlaceVotePanel Card 내부, 지도 위 영역
 * - Card `p-6` padding-top 24px
 * - CardTitle `text-base` (~24px)
 * - CardDescription `mt-1` `text-sm` (~20px)
 * - 지도 wrapper `mt-4` (16px)
 */
export const PLACE_VOTE_MAP_CARD_HEADER_PX = 84;

/**
 * PlaceVotePanel 지도 아래 후보 카드 peek
 * - Card와 grid 사이 `space-y-4` (16px)
 * - 후보 버튼 1개 최소 높이 (~140px, `p-4` + badge·주소·이동시간)
 */
export const PLACE_VOTE_BOTTOM_PANEL_PX = 156;

function clampMapHeight(subtractPx: number): string {
  return `clamp(${MAP_HEIGHT_MIN_PX}px, calc(100dvh - ${subtractPx}px), ${MAP_HEIGHT_MAX_PX}px)`;
}

/** /places/map — 선택 장소 Card가 있을 때 하단 영역을 추가로 제외 */
export function placesMapViewportHeight(hasSelectedPlace: boolean): string {
  const bottomReserve = hasSelectedPlace ? PLACES_MAP_SELECTED_CARD_RESERVE_PX : 0;
  const subtract =
    APP_CONTENT_HEADER_HEIGHT_PX + PLACES_MAP_PAGE_TOP_CHROME_PX + bottomReserve;
  return clampMapHeight(subtract);
}

/** PlaceVotePanel — AppShell 헤더 + 카드 헤더 + 하단 후보 카드 peek 제외 */
export function placeVoteMapViewportHeight(): string {
  const subtract =
    APP_CONTENT_HEADER_HEIGHT_PX +
    PLACE_VOTE_MAP_CARD_HEADER_PX +
    PLACE_VOTE_BOTTOM_PANEL_PX;
  return clampMapHeight(subtract);
}

/** lg split — AppShell 헤더 + /places/map 페이지 상단 chrome만 제외 */
export function placesMapSplitGridHeight(): string {
  return clampMapHeight(APP_CONTENT_HEADER_HEIGHT_PX + PLACES_MAP_PAGE_TOP_CHROME_PX);
}

/** lg split — AppShell 헤더만 제외 (PlaceVotePanel 그리드 행) */
export function placeVoteSplitGridHeight(): string {
  return clampMapHeight(APP_CONTENT_HEADER_HEIGHT_PX);
}
