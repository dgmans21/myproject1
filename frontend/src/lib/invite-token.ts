/** 초대 URL용 추측 불가능 토큰 생성 */
export function generateInviteToken(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    const a = crypto.randomUUID().replace(/-/g, "");
    const b = crypto.randomUUID().replace(/-/g, "").slice(0, 16);
    return `${a}${b}`;
  }
  return `inv${Date.now()}${Math.random().toString(36).slice(2, 18)}`;
}

export function defaultInviteExpiry(days = 14): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}
