export function transformLevelWithRandomVariant(levelData: any) {
  // Əgər admin heç bir variant əlavə etməyibsə, birbaşa köhnə variantı qaytar
  if (!levelData.variants || levelData.variants.length === 0) {
    return levelData;
  }

  // 1. 3-4 variant arasından random bir indeks seçirik
  const randomIndex = Math.floor(Math.random() * levelData.variants.length);
  const secilenSsenari = levelData.variants[randomIndex];

  // Dəyişənləri daha rahat oxumaq üçün obyekt halına salırıq: { "$a": "10", "$b": "20" }
  const degiskenler: Record<string, string> = {};
  secilenSsenari.values.forEach((item: any) => {
    degiskenler[item.name] = item.value;
  });

  // 2. xanaYazilari daxilindəki $a, $b, $c-ləri real deyerlerle evez edirik
  const dynamicXanaYazilari = levelData.xanaYazilari.map((row: string[]) =>
    row.map(cell => {
      if (cell && cell.startsWith('$') && degiskenler[cell] !== undefined) {
        return degiskenler[cell];
      }
      return cell;
    })
  );

  // 3. requiredWrites daxilindəki expected (gözlənilən yazı) hissəsini əvəz edirik
  const dynamicRequiredWrites = levelData.requiredWrites.map((w: any) => ({
    ...w,
    expected: (w.expected && w.expected.startsWith('$') && degiskenler[w.expected] !== undefined) 
      ? degiskenler[w.expected] 
      : w.expected
  }));

  // 4. xalSistemi daxilindəki cavab-ları əvəz edirik
  const dynamicXalSistemi = levelData.xalSistemi.map((x: any) => ({
    ...x,
    cavab: (x.cavab && x.cavab.startsWith('$') && degiskenler[x.cavab] !== undefined) 
      ? degiskenler[x.cavab] 
      : x.cavab
  }));

  // Yenilənmiş və uşağın görəcəyi təmiz obyekti qaytarırıq
  return {
    ...levelData,
    xanaYazilari: dynamicXanaYazilari,
    requiredWrites: dynamicRequiredWrites,
    xalSistemi: dynamicXalSistemi,
    activeVariantIndex: randomIndex // Yoxlama zamanı lazım ola bilər deyə indeksi də saxlayırıq
  };
}