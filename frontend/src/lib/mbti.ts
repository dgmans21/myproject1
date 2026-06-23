/** MBTI별 차분한(쨍하지 않은) 색상 */
export const MBTI_COLORS: Record<string, { bg: string; text: string }> = {
  INTJ: { bg: "#E8EAF6", text: "#3949AB" },
  INTP: { bg: "#E3F2FD", text: "#1565C0" },
  ENTJ: { bg: "#F3E5F5", text: "#6A1B9A" },
  ENTP: { bg: "#EDE7F6", text: "#512DA8" },
  INFJ: { bg: "#E0F2F1", text: "#00695C" },
  INFP: { bg: "#E8F5E9", text: "#2E7D32" },
  ENFJ: { bg: "#FFF3E0", text: "#E65100" },
  ENFP: { bg: "#FFF8E1", text: "#F57F17" },
  ISTJ: { bg: "#ECEFF1", text: "#455A64" },
  ISFJ: { bg: "#F1F8E9", text: "#558B2F" },
  ESTJ: { bg: "#E1F5FE", text: "#0277BD" },
  ESFJ: { bg: "#FCE4EC", text: "#AD1457" },
  ISTP: { bg: "#EFEBE9", text: "#4E342E" },
  ISFP: { bg: "#F9FBE7", text: "#827717" },
  ESTP: { bg: "#FFEBEE", text: "#C62828" },
  ESFP: { bg: "#FFFDE7", text: "#F9A825" },
};

export const MBTI_OPTIONS = Object.keys(MBTI_COLORS);

export function mbtiStyle(type: string) {
  return MBTI_COLORS[type.toUpperCase()] ?? { bg: "#F1F5F9", text: "#64748B" };
}
