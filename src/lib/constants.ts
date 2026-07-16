export interface AnimalType {
  id: number;
  name: string;
  type: string;
  powerLevel: number;
  imagePath: string;
  skill: string;
}

export const animalsDataForest = [
  { id: 1, nameAz: "Canavar", nameEn: "Wolf", image: "1.jpg" },
  { id: 2, nameAz: "Kirpi", nameEn: "Hedgehog", image: "2.jpg" },
  { id: 3, nameAz: "Ayı", nameEn: "Bear", image: "3.jpg" },
  { id: 4, nameAz: "Tısbağa", nameEn: "Turtle", image: "4.jpg" },
  { id: 5, nameAz: "Bəbir", nameEn: "Leopard", image: "5.jpg" },
  { id: 6, nameAz: "Sincab (Zolaqlı)", nameEn: "Chipmunk", image: "6.jpg" },
  { id: 7, nameAz: "Maral", nameEn: "Deer", image: "7.jpg" },
  { id: 8, nameAz: "Bayquş", nameEn: "Owl", image: "8.jpg" },
  { id: 9, nameAz: "Sığın", nameEn: "Moose", image: "9.jpg" },
  { id: 10, nameAz: "Dələ", nameEn: "Squirrel", image: "10.jpg" },
  { id: 11, nameAz: "Bizon", nameEn: "Bison", image: "11.jpg" },
  { id: 12, nameAz: "Tənbəllər", nameEn: "Sloth", image: "12.jpg" },
  { id: 13, nameAz: "Surikat", nameEn: "Meerkat", image: "13.jpg" }
];

export const animalsDataForests = [
  { id: 1, name: "Bozqır", type: "Canavar", powerLevel: 80, imagePath: "/animals/1.jpg", skill: "Sürü Liderliyi" },
  { id: 2, name: "Tikan", type: "Kirpi", powerLevel: 45, imagePath: "/animals/2.jpg", skill: "İynəli Qorunma" },
  { id: 3, name: "Mayya", type: "Ayı", powerLevel: 90, imagePath: "/animals/3.jpg", skill: "Pəncə Zərbəsi" },
  { id: 4, name: "Tiko", type: "Tısbağa", powerLevel: 50, imagePath: "/animals/4.jpg", skill: "Sarsılmaz Zireh" },
  { id: 5, name: "Leo", type: "Bəbir", powerLevel: 85, imagePath: "/animals/5.jpg", skill: "Sürətli Qaçış" },
  { id: 6, name: "Çippi", type: "Sincab (Zolaqlı)", powerLevel: 35, imagePath: "/animals/6.jpg", skill: "Qoz Gizlətmək" },
  { id: 7, name: "Zərif", type: "Maral", powerLevel: 65, imagePath: "/animals/7.jpg", skill: "Yüksək Atılış" },
  { id: 8, name: "Huku", type: "Bayquş", powerLevel: 70, imagePath: "/animals/8.jpg", skill: "Gecəgörmə fəhmi" },
  { id: 9, name: "Bulat", type: "Sığın", powerLevel: 75, imagePath: "/animals/9.jpg", skill: "Buynuz Hücumu" },
  { id: 10, name: "Fındıq", type: "Dələ", powerLevel: 40, imagePath: "/animals/10.jpg", skill: "Ağacdan-Ağaca Atılma" },
  { id: 11, name: "Qaya", type: "Bizon", powerLevel: 88, imagePath: "/animals/11.jpg", skill: "Dağıdıcı Güc" },
  { id: 12, name: "Yavaş", type: "Tənbəllər", powerLevel: 30, imagePath: "/animals/12.jpg", skill: "Enerji Qənaəti" },
  { id: 13, name: "Suri", type: "Surikat", powerLevel: 48, imagePath: "/animals/13.jpg", skill: "Keşikçi Baxışı" }
];


export const animalsDataAdventurers = [
  { id: 1, name: "Leo", type: "Bəbir", powerLevel: 85, imagePath: "/jungle/1.png", skill: "Sürətli Qaçış" },
  { id: 2, name: "Coco", type: "Tutuquşu", powerLevel: 45, imagePath: "/jungle/2.png", skill: "Yüksəkdən Uçuş" },
  { id: 3, name: "Tiki", type: "Tukan", powerLevel: 50, imagePath: "/jungle/3.png", skill: "Meyvə Tapmaq" },
  { id: 4, name: "Momo", type: "Meymun", powerLevel: 65, imagePath: "/jungle/4.png", skill: "Ağaca Dırmaşmaq" },
  { id: 5, name: "Lemmy", type: "Lemur", powerLevel: 55, imagePath: "/jungle/5.png", skill: "Gecə Görməsi" },
  { id: 6, name: "Snappy", type: "Timsah", powerLevel: 90, imagePath: "/jungle/6.png", skill: "Güclü Dişləmə" },
  { id: 7, name: "Cappy", type: "Kapibara", powerLevel: 40, imagePath: "/jungle/7.png", skill: "Sakitləşdirmə" },
  { id: 8, name: "Coati", type: "Koati", powerLevel: 60, imagePath: "/jungle/8.png", skill: "Gizli Qoxulama" }
];