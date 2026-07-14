const POSTCODE_SCRIPT_URL =
  "https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";

let scriptLoadPromise: Promise<void> | null = null;

function resetScriptLoadPromise() {
  scriptLoadPromise = null;
}

export function loadDaumPostcodeScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("브라우저 환경에서만 사용할 수 있습니다"));
  }

  if (window.daum?.Postcode) {
    return Promise.resolve();
  }

  if (!scriptLoadPromise) {
    scriptLoadPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = POSTCODE_SCRIPT_URL;
      script.async = true;
      script.onload = () => {
        if (!window.daum?.Postcode) {
          resetScriptLoadPromise();
          reject(new Error("다음 주소검색 스크립트 초기화에 실패했습니다"));
          return;
        }
        resolve();
      };
      script.onerror = () => {
        resetScriptLoadPromise();
        reject(new Error("다음 주소검색 스크립트를 불러오지 못했습니다"));
      };
      document.head.appendChild(script);
    });
  }

  return scriptLoadPromise;
}

/** 검색 결과에서 저장·지오코딩에 쓸 주소 문자열 */
export function formatPostcodeAddress(data: daum.PostcodeData): string {
  const base = data.roadAddress || data.jibunAddress || data.address;
  if (data.buildingName) {
    return `${base} ${data.buildingName}`.trim();
  }
  return base;
}

export interface EmbedDaumPostcodeOptions {
  container: HTMLElement;
  onComplete: (address: string, data: daum.PostcodeData) => void;
  onClose?: (state: "FORCE_CLOSE" | "COMPLETE_CLOSE") => void;
}

/** 다음(카카오) 주소 검색 — 지정 요소에 embed */
export async function embedDaumPostcode({
  container,
  onComplete,
  onClose,
}: EmbedDaumPostcodeOptions): Promise<void> {
  await loadDaumPostcodeScript();
  container.innerHTML = "";
  new window.daum!.Postcode({
    width: "100%",
    height: "100%",
    oncomplete: (data) => {
      onComplete(formatPostcodeAddress(data), data);
    },
    onclose: (state) => {
      onClose?.(state);
    },
  }).embed(container);
}
