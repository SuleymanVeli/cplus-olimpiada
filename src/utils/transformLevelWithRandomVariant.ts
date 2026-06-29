export function transformLevelWithRandomVariant(levelData: any) {
  // Əgər admin heç bir variant əlavə etməyibsə, birbaşa köhnə variantı qaytar
  if (!levelData.variants || levelData.variants.length === 0) {
    return levelData;
  }

  // 1. 3-4 variant arasından random bir indeks seçirik
  const randomIndex = Math.floor(Math.random() * levelData.variants.length);
  const secilenSsenari = levelData.variants[randomIndex];

  // Dəyişənləri və boş olanları təyin edirik
  const degiskenler: Record<string, string> = {};
  const bosDegiskenler = new Set<string>(); // Boş string olan variable-ları burada tuturuq

  secilenSsenari.values.forEach((item: any) => {
    const trimmedValue = item.value ? item.value.trim() : "";
    
    if (trimmedValue === "") {
      bosDegiskenler.add(item.name);
    } else {
      degiskenler[item.name] = trimmedValue;
    }
  });

  // 2. xanaYazilari daxilindəki $a, $b, $c-ləri real deyerlerle evez edirik
  const dynamicXanaYazilari = levelData.xanaYazilari.map((row: string[]) =>
    row.map(cell => {
      if (cell && cell.startsWith('$')) {
        if (degiskenler[cell] !== undefined) return degiskenler[cell];
        if (bosDegiskenler.has(cell)) return ""; // Matris quruluşu pozulmasın deyə boş string qoyuruq
      }
      return cell;
    })
  );

  // 3. requiredWrites daxilindəki expected boşdursa, obyekti massivdən tamamilə silirik (filter edirik)
  const dynamicRequiredWrites = levelData.requiredWrites
    .map((w: any) => {
      let currentExpected = w.expected;
      if (w.expected && w.expected.startsWith('$')) {
        if (degiskenler[w.expected] !== undefined) currentExpected = degiskenler[w.expected];
        if (bosDegiskenler.has(w.expected)) currentExpected = "__DELETED__"; // Silinmək üçün nişanlayırıq
      }
      return { ...w, expected: currentExpected };
    })
    .filter((w: any) => w.expected !== "__DELETED__"); // Boş olanları datadan silirik

  // 4. xalSistemi daxilindəki cavab-lar boşdursa, obyekti massivdən tamamilə silirik
  const dynamicXalSistemi = levelData.xalSistemi
    .map((x: any) => {
      let currentCavab = x.cavab;
      if (x.cavab && x.cavab.startsWith('$')) {
        if (degiskenler[x.cavab] !== undefined) currentCavab = degiskenler[x.cavab];
        if (bosDegiskenler.has(x.cavab)) currentCavab = "__DELETED__"; // Silinmək üçün nişanlayırıq
      }
      return { ...x, cavab: currentCavab };
    })
    .filter((x: any) => x.cavab !== "__DELETED__"); // Boş olanları datadan silirik

  // Yenilənmiş və uşağın görəcəyi təmiz obyekti qaytarırıq
  return {
    ...levelData,
    xanaYazilari: dynamicXanaYazilari,
    requiredWrites: dynamicRequiredWrites,
    xalSistemi: dynamicXalSistemi,
    activeVariantIndex: randomIndex // Yoxlama zamanı lazım ola bilər deyə indeksi də saxlayırıq
  };
}