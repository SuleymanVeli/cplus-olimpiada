export const formatCountdown = (ms: number) => {
  if (!ms || ms <= 0) return 'Tezliklə açılır!';

  const totalSeconds = Math.floor(ms / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const days = Math.floor(hours / 24);

  // 1) Əgər vaxt 30 gündən çoxdursa -> Sınaq/Test tələbəsi üçün xüsusi mesaj
  if (days >= 30) {
    return 'Sınaq mərhələniz başa çatdı! Davam etmək üçün bizimilə əlaqə saxlayın 🚀';
  }

  // 2) 1 gün ilə 30 gün arasındadırsa -> Gün sayı
  if (days >= 1) {
    return `${days} gün sonra açılır ⏳`;
  }

  // 3) 24 saatdan azdırsa -> Saat : Dəqiqə : Saniyə
  const remainingHours = hours % 24;
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (num: number) => String(num).padStart(2, '0');

  return `Açılışa qalan vaxt: ${pad(remainingHours)}:${pad(minutes)}:${pad(seconds)} ⏳`;
};