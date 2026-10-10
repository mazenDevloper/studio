/** A country's flag picture (flagcdn) from its name, English or Arabic; null when unknown. */
const ISO: Record<string, string> = {
  england: "gb-eng", "إنجلترا": "gb-eng", "انجلترا": "gb-eng", scotland: "gb-sct", "اسكتلندا": "gb-sct", wales: "gb-wls", "northern ireland": "gb-nir",
  spain: "es", "إسبانيا": "es", "اسبانيا": "es", italy: "it", "إيطاليا": "it", "ايطاليا": "it", germany: "de", "ألمانيا": "de", "المانيا": "de",
  france: "fr", "فرنسا": "fr", netherlands: "nl", holland: "nl", "هولندا": "nl", portugal: "pt", "البرتغال": "pt", belgium: "be", "بلجيكا": "be",
  turkey: "tr", "türkiye": "tr", "تركيا": "tr", "saudi arabia": "sa", saudi: "sa", "السعودية": "sa", oman: "om", "عمان": "om", "عُمان": "om",
  uae: "ae", "united arab emirates": "ae", "الإمارات": "ae", "الامارات": "ae", qatar: "qa", "قطر": "qa", kuwait: "kw", "الكويت": "kw",
  bahrain: "bh", "البحرين": "bh", egypt: "eg", "مصر": "eg", morocco: "ma", "المغرب": "ma", tunisia: "tn", "تونس": "tn", algeria: "dz", "الجزائر": "dz",
  iraq: "iq", "العراق": "iq", jordan: "jo", "الأردن": "jo", syria: "sy", lebanon: "lb", libya: "ly", sudan: "sd", yemen: "ye", palestine: "ps",
  usa: "us", "united states": "us", "أمريكا": "us", mexico: "mx", brazil: "br", "البرازيل": "br", argentina: "ar", "الأرجنتين": "ar",
  japan: "jp", "اليابان": "jp", "south korea": "kr", "korea republic": "kr", china: "cn", australia: "au", india: "in", iran: "ir", "إيران": "ir",
  russia: "ru", greece: "gr", austria: "at", switzerland: "ch", denmark: "dk", sweden: "se", norway: "no", ireland: "ie", poland: "pl",
  czechia: "cz", "czech republic": "cz", croatia: "hr", serbia: "rs", ukraine: "ua", romania: "ro", hungary: "hu", israel: "il", cyprus: "cy",
  colombia: "co", chile: "cl", uruguay: "uy", peru: "pe", ecuador: "ec", paraguay: "py", nigeria: "ng", ghana: "gh", "south africa": "za",
  europe: "eu", "أوروبا": "eu", "اوروبا": "eu",
};

export function flagUrl(country?: string): string | null {
  const k = (country ?? "").trim().toLowerCase();
  const iso = ISO[k];
  return iso ? `https://flagcdn.com/w40/${iso}.png` : null;
}
