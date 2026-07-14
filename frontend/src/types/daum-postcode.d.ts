/** 카카오(다음) 우편번호 · 주소 검색 API */
interface Window {
  daum?: typeof daum;
}

declare namespace daum {
  interface PostcodeData {
    address: string;
    addressType: "R" | "J";
    roadAddress: string;
    jibunAddress: string;
    zonecode: string;
    buildingName?: string;
    apartment?: string;
    bname?: string;
  }

  interface PostcodeOpenOptions {
    left?: number;
    top?: number;
    popupName?: string;
  }

  class Postcode {
    constructor(options: {
      oncomplete: (data: PostcodeData) => void;
      onclose?: (state: "FORCE_CLOSE" | "COMPLETE_CLOSE") => void;
      width?: string | number;
      height?: string | number;
    });
    open(options?: PostcodeOpenOptions): void;
    embed(element: HTMLElement): void;
  }
}
