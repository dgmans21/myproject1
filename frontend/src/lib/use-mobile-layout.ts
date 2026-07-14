"use client";

import { useEffect, useState } from "react";
import { MOBILE_LAYOUT_MQ } from "@/lib/mobile-form-scroll";

export function useIsMobileLayout(): boolean {
  const [mobile, setMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_LAYOUT_MQ);
    const update = () => setMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return mobile;
}
