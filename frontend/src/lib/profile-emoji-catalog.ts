/** 취미·관심 이모지 검색용 카탈로그 (한국어·영어 키워드) */

export interface EmojiCatalogEntry {
  emoji: string;
  keywords: string[];
}

export const EMOJI_SEARCH_CATALOG: EmojiCatalogEntry[] = [
  // 스포츠
  { emoji: "⚽", keywords: ["축구", "풋볼", "soccer", "football", "스포츠"] },
  { emoji: "⚾", keywords: ["야구", "baseball", "스포츠"] },
  { emoji: "🏀", keywords: ["농구", "basketball", "스포츠"] },
  { emoji: "🏈", keywords: ["미식축구", "football", "스포츠"] },
  { emoji: "🎾", keywords: ["테니스", "tennis", "스포츠"] },
  { emoji: "🏐", keywords: ["배구", "volleyball", "스포츠"] },
  { emoji: "🏓", keywords: ["탁구", "ping pong", "스포츠"] },
  { emoji: "🏸", keywords: ["배드민턴", "badminton", "스포츠"] },
  { emoji: "⛳", keywords: ["골프", "golf", "스포츠"] },
  { emoji: "🎳", keywords: ["볼링", "bowling", "스포츠"] },
  { emoji: "🏊", keywords: ["수영", "swim", "스포츠"] },
  { emoji: "🤿", keywords: ["스킨스쿠버", "다이빙", "diving", "스노클", "snorkel"] },
  { emoji: "🚴", keywords: ["자전거", "사이클", "cycling", "라이딩"] },
  { emoji: "🏃", keywords: ["달리기", "러닝", "run", "조깅"] },
  { emoji: "🧘", keywords: ["요가", "yoga", "명상", "meditation"] },
  { emoji: "🏋️", keywords: ["헬스", "웨이트", "gym", "운동"] },
  { emoji: "🥊", keywords: ["복싱", "boxing", "격투"] },
  { emoji: "🥋", keywords: ["무술", "태권도", "martial arts"] },
  { emoji: "⛷️", keywords: ["스키", "ski", "겨울"] },
  { emoji: "🏂", keywords: ["스노보드", "snowboard", "겨울"] },
  { emoji: "🛹", keywords: ["스케이트", "skate", "보드"] },
  { emoji: "🧗", keywords: ["클라이밍", "등반", "climbing"] },
  { emoji: "🏄", keywords: ["서핑", "surf", "파도"] },
  { emoji: "🤸", keywords: ["체조", "gymnastics"] },
  { emoji: "🎯", keywords: ["다트", "dart", "양궁", "target"] },
  { emoji: "🏹", keywords: ["양궁", "archery"] },
  { emoji: "🥅", keywords: ["하키", "hockey", "골대"] },
  { emoji: "🤺", keywords: ["펜싱", "fencing"] },
  { emoji: "🎿", keywords: ["스키", "ski"] },
  // 동물
  { emoji: "🐱", keywords: ["고양이", "cat", "냥"] },
  { emoji: "🐶", keywords: ["강아지", "개", "dog", "멍"] },
  { emoji: "🦁", keywords: ["사자", "lion"] },
  { emoji: "🐯", keywords: ["호랑이", "tiger"] },
  { emoji: "🐻", keywords: ["곰", "bear"] },
  { emoji: "🦅", keywords: ["독수리", "eagle", "매", "새"] },
  { emoji: "🐼", keywords: ["판다", "panda"] },
  { emoji: "🐨", keywords: ["코알라", "koala"] },
  { emoji: "🐰", keywords: ["토끼", "rabbit"] },
  { emoji: "🦊", keywords: ["여우", "fox"] },
  { emoji: "🐺", keywords: ["늑대", "wolf"] },
  { emoji: "🐴", keywords: ["말", "horse"] },
  { emoji: "🦄", keywords: ["유니콘", "unicorn"] },
  { emoji: "🐸", keywords: ["개구리", "frog"] },
  { emoji: "🐢", keywords: ["거북이", "turtle"] },
  { emoji: "🐍", keywords: ["뱀", "snake"] },
  { emoji: "🦋", keywords: ["나비", "butterfly"] },
  { emoji: "🐝", keywords: ["벌", "bee"] },
  { emoji: "🐬", keywords: ["돌고래", "dolphin"] },
  { emoji: "🐳", keywords: ["고래", "whale"] },
  { emoji: "🦈", keywords: ["상어", "shark"] },
  { emoji: "🐠", keywords: ["물고기", "fish", "열대어"] },
  { emoji: "🐙", keywords: ["문어", "octopus"] },
  { emoji: "🦀", keywords: ["게", "crab"] },
  { emoji: "🦞", keywords: ["랍스터", "lobster"] },
  { emoji: "🐹", keywords: ["햄스터", "hamster"] },
  { emoji: "🐷", keywords: ["돼지", "pig"] },
  { emoji: "🐮", keywords: ["소", "cow"] },
  { emoji: "🐔", keywords: ["닭", "chicken"] },
  { emoji: "🦆", keywords: ["오리", "duck"] },
  { emoji: "🦉", keywords: ["부엉이", "owl"] },
  { emoji: "🐧", keywords: ["펭귄", "penguin"] },
  { emoji: "🦩", keywords: ["플라밍고", "flamingo"] },
  { emoji: "🐘", keywords: ["코끼리", "elephant"] },
  { emoji: "🦒", keywords: ["기린", "giraffe"] },
  { emoji: "🦓", keywords: ["얼룩말", "zebra"] },
  { emoji: "🦘", keywords: ["캥거루", "kangaroo"] },
  // 음악·예술·미디어
  { emoji: "🎮", keywords: ["게임", "game", "플레이", "gaming"] },
  { emoji: "🎸", keywords: ["기타", "guitar", "밴드", "rock"] },
  { emoji: "🎹", keywords: ["피아노", "piano", "키보드"] },
  { emoji: "🎤", keywords: ["노래", "마이크", "sing", "karaoke", "노래방"] },
  { emoji: "🎧", keywords: ["헤드폰", "음악", "music", "듣기"] },
  { emoji: "🎬", keywords: ["영화", "movie", "film", "시네마"] },
  { emoji: "📷", keywords: ["사진", "camera", "촬영", "포토"] },
  { emoji: "🎨", keywords: ["그림", "art", "미술", "드로잉", "그리기"] },
  { emoji: "🎭", keywords: ["연극", "theater", "공연"] },
  { emoji: "🎻", keywords: ["바이올린", "violin", "클래식"] },
  { emoji: "🥁", keywords: ["드럼", "drum"] },
  { emoji: "🎺", keywords: ["트럼펫", "trumpet"] },
  { emoji: "🎷", keywords: ["색소폰", "saxophone", "jazz"] },
  { emoji: "📺", keywords: ["TV", "텔레비전", "드라마", "방송"] },
  { emoji: "📚", keywords: ["책", "book", "독서", "reading"] },
  { emoji: "✍️", keywords: ["글쓰기", "writing", "작문"] },
  { emoji: "💻", keywords: ["코딩", "컴퓨터", "coding", "개발", "programming"] },
  { emoji: "🎲", keywords: ["보드게임", "board game", "주사위", "dice"] },
  { emoji: "🧩", keywords: ["퍼즐", "puzzle", "직소"] },
  { emoji: "♟️", keywords: ["체스", "chess"] },
  { emoji: "🃏", keywords: ["카드", "card", "포커"] },
  // 음식·요리
  { emoji: "🧑‍🍳", keywords: ["요리", "cook", "chef", "셰프", "주방"] },
  { emoji: "☕", keywords: ["커피", "coffee", "카페", "cafe"] },
  { emoji: "🍳", keywords: ["계란", "아침", "브런치", "egg"] },
  { emoji: "🍕", keywords: ["피자", "pizza"] },
  { emoji: "🍔", keywords: ["햄버거", "burger"] },
  { emoji: "🍣", keywords: ["초밥", "sushi", "일식"] },
  { emoji: "🍜", keywords: ["라면", "ramen", "면"] },
  { emoji: "🍰", keywords: ["케이크", "cake", "디저트"] },
  { emoji: "🍺", keywords: ["맥주", "beer", "술"] },
  { emoji: "🍷", keywords: ["와인", "wine"] },
  { emoji: "🍵", keywords: ["차", "tea", "녹차"] },
  { emoji: "🧋", keywords: ["버블티", "boba", "밀크티"] },
  { emoji: "🍫", keywords: ["초콜릿", "chocolate"] },
  { emoji: "🍦", keywords: ["아이스크림", "ice cream"] },
  { emoji: "🥐", keywords: ["빵", "bakery", "베이커리", "크루아상"] },
  { emoji: "🌮", keywords: ["타코", "taco", "멕시코"] },
  { emoji: "🍱", keywords: ["도시락", "bento", "한식"] },
  { emoji: "🥘", keywords: ["찌개", "요리", "stew"] },
  // 여행·야외
  { emoji: "✈️", keywords: ["여행", "travel", "비행", "flight", "trip"] },
  { emoji: "🏕️", keywords: ["캠핑", "camping", "야영"] },
  { emoji: "🏖️", keywords: ["해변", "beach", "바다"] },
  { emoji: "🏔️", keywords: ["산", "mountain", "등산", "hiking"] },
  { emoji: "🗺️", keywords: ["지도", "map", "탐험"] },
  { emoji: "🚗", keywords: ["드라이브", "drive", "자동차", "car"] },
  { emoji: "🏍️", keywords: ["오토바이", "motorcycle", "바이크"] },
  { emoji: "🚢", keywords: ["크루즈", "ship", "배"] },
  { emoji: "🎡", keywords: ["놀이공원", "amusement", "theme park"] },
  { emoji: "🎢", keywords: ["롤러코스터", "roller coaster"] },
  { emoji: "⛺", keywords: ["텐트", "tent", "캠핑"] },
  { emoji: "🌅", keywords: ["일출", "sunrise"] },
  { emoji: "🌃", keywords: ["야경", "night", "도시"] },
  // 자연·식물
  { emoji: "🌱", keywords: ["식물", "plant", "키우기", "가드닝"] },
  { emoji: "🌸", keywords: ["벚꽃", "flower", "꽃"] },
  { emoji: "🌻", keywords: ["해바라기", "sunflower"] },
  { emoji: "🌿", keywords: ["허브", "herb", "자연"] },
  { emoji: "🍀", keywords: ["클로버", "clover", "행운"] },
  { emoji: "🌲", keywords: ["숲", "forest", "나무"] },
  { emoji: "🌊", keywords: ["파도", "wave", "바다", "ocean"] },
  { emoji: "🔥", keywords: ["불", "fire", "캠프파이어"] },
  { emoji: "⭐", keywords: ["별", "star", "우주"] },
  { emoji: "🌙", keywords: ["달", "moon", "밤"] },
  { emoji: "☀️", keywords: ["태양", "sun", "날씨"] },
  { emoji: "❄️", keywords: ["눈", "snow", "겨울"] },
  // 취미·라이프
  { emoji: "🛍️", keywords: ["쇼핑", "shopping"] },
  { emoji: "💄", keywords: ["뷰티", "beauty", "메이크업", "makeup"] },
  { emoji: "👗", keywords: ["패션", "fashion", "옷"] },
  { emoji: "💅", keywords: ["네일", "nail", "손톱"] },
  { emoji: "🏠", keywords: ["집", "home", "홈"] },
  { emoji: "🧶", keywords: ["뜨개", "knit", "뜨개질"] },
  { emoji: "🪴", keywords: ["화분", "pot", "실내식물"] },
  { emoji: "📱", keywords: ["스마트폰", "phone", "모바일"] },
  { emoji: "🎁", keywords: ["선물", "gift"] },
  { emoji: "💡", keywords: ["아이디어", "idea", "창의"] },
  { emoji: "🔭", keywords: ["천문", "telescope", "별관측"] },
  { emoji: "🧪", keywords: ["과학", "science", "실험"] },
  { emoji: "♻️", keywords: ["환경", "eco", "재활용"] },
  { emoji: "🤝", keywords: ["봉사", "volunteer", "협력"] },
  { emoji: "💪", keywords: ["운동", "fitness", "근육"] },
  { emoji: "😴", keywords: ["수면", "sleep", "잠"] },
  { emoji: "🎉", keywords: ["파티", "party", "축하"] },
  { emoji: "🎂", keywords: ["생일", "birthday"] },
  { emoji: "💒", keywords: ["웨딩", "wedding", "결혼"] },
  { emoji: "👶", keywords: ["육아", "baby", "아기"] },
  { emoji: "🐾", keywords: ["반려동물", "pet"] },
  { emoji: "📖", keywords: ["소설", "novel", "읽기"] },
  { emoji: "🎼", keywords: ["악보", "score", "클래식"] },
  { emoji: "🎵", keywords: ["음표", "music", "노래"] },
  { emoji: "🏆", keywords: ["트로피", "trophy", "우승", "e스포츠"] },
  { emoji: "🕹️", keywords: ["아케이드", "arcade", "레트로게임"] },
  { emoji: "👾", keywords: ["레트로", "retro", "게임"] },
  { emoji: "🤖", keywords: ["로봇", "robot", "AI"] },
  { emoji: "🚀", keywords: ["우주", "space", "rocket"] },
  { emoji: "⚡", keywords: ["번개", "energy", "에너지"] },
  { emoji: "🎪", keywords: ["서커스", "circus", "공연"] },
  { emoji: "🛠️", keywords: ["DIY", "공구", "만들기"] },
  { emoji: "🧵", keywords: ["바느질", "sewing", "재봉"] },
  { emoji: "🎣", keywords: ["낚시", "fishing"] },
  { emoji: "⛸️", keywords: ["스케이트", "skating", "아이스"] },
];

const catalogByEmoji = new Map(EMOJI_SEARCH_CATALOG.map((e) => [e.emoji, e]));

/** 빠른 선택 목록도 검색에 포함 (키워드 없으면 이모지 자체로만 매칭) */
export function searchEmojiCatalog(query: string, limit = 48): EmojiCatalogEntry[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const tokens = q.split(/\s+/).filter(Boolean);
  const scored: { entry: EmojiCatalogEntry; score: number }[] = [];

  for (const entry of EMOJI_SEARCH_CATALOG) {
    let score = 0;
    for (const token of tokens) {
      for (const kw of entry.keywords) {
        const lower = kw.toLowerCase();
        if (lower === token) score += 10;
        else if (lower.startsWith(token)) score += 6;
        else if (lower.includes(token)) score += 3;
      }
      if (entry.emoji.includes(token)) score += 1;
    }
    if (score > 0) scored.push({ entry, score });
  }

  scored.sort((a, b) => b.score - a.score);
  const seen = new Set<string>();
  const out: EmojiCatalogEntry[] = [];
  for (const { entry } of scored) {
    if (seen.has(entry.emoji)) continue;
    seen.add(entry.emoji);
    out.push(entry);
    if (out.length >= limit) break;
  }
  return out;
}

export function getEmojiCatalogLabel(emoji: string): string | undefined {
  return catalogByEmoji.get(emoji)?.keywords[0];
}
