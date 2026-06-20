const validateCodeRules = (userCode: string, rules: { required?: string[], forbidden?: string[], maxUsage?: Record<string, number> }): string | null => {
  if (!rules) return null;

  // 1. Kod daxilindəki şərhləri (comments) təmizləyirik ki, şagird şərh daxilində qadağan olunmuş söz yazsa, sistem səhvən bloklamasın.
  const cleanCode = userCode.replace(/\/\/.*|\/\*[\s\S]*?\*\//g, "");

  // ---- A. 🔴 QADAĞAN OLUNMUŞ ƏMRLƏRİN YOXLANILMASI ----
  if (rules.forbidden && rules.forbidden.length > 0) {
    for (const keyword of rules.forbidden) {
      if (cleanCode.includes(keyword)) {
        return `Bu mərhələdə "${keyword}" komandasından istifadə etmək qadağandır!`;
      }
    }
  }

  // ---- B. 🟢 MÜTLƏQ OLAN ƏMRLƏRİN YOXLANILMASI ----
  if (rules.required && rules.required.length > 0) {
    for (const keyword of rules.required) {
      if (!cleanCode.includes(keyword)) {
        return `Mərhələni keçmək üçün kodunuzda mütləq "${keyword}" komandası olmalıdır!`;
      }
    }
  }

  // ---- C. 🟡 MAKSİMUM İSTİFADƏ SAYININ (LİMİTİN) YOXLANILMASI ----
  if (rules.maxUsage && Object.keys(rules.maxUsage).length > 0) {
    for (const [keyword, maxCount] of Object.entries(rules.maxUsage)) {
      // Regex üçün xüsusi simvolları (məsələn: '(', ')') escape edirik
      const escapedKeyword = keyword.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedKeyword, 'g');
      
      // Kod daxilində bu sözün neçə dəfə keçdiyini tapırıq
      const matches = cleanCode.match(regex);
      const count = matches ? matches.length : 0;

      if (count > maxCount) {
        return `"${keyword}" əmrini ən çox ${maxCount} dəfə yaza bilərsiniz. Sizin kodda istifadə sayı: ${count}`;
      }
    }
  }

  return null; // Əgər heç bir qayda pozulmayıbsa, geriyə null qayıdır (hər şey qaydasındadır)
};

export default validateCodeRules;