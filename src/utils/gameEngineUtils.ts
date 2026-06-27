interface CavabXal {
    cavab: string; // Strukturda hər şeyi string saxlayırıq ki, həm "45", həm "MagiForest" tutulsun
    verilecekXal: number;
    mesaj: string;
}

interface RequiredWrite {
    x: number;
    y: number;
    expected: string;
}

interface LevelData {
    levelPoint: number;
    startX: number;
    startY: number;
    mapLayout: number[][];
    xanaYazilari: string[][];
    xanaTipleri: string[][]; // Portalları təhlükəsiz massiv formatına saldıq
    xalSistemi?: CavabXal[]; // Terminal xal sistemi
    hasWriteTask: boolean;
    requiredWrites: RequiredWrite[];
    startDirection: string;
}


// Matrisi C++ formatında sətirlərə çevirmək üçün
const matrixToCppString = (matrix: any[][], isString: boolean = false): string => {
    return matrix.map(row => {
        const formattedRow = row.map(cell => isString ? `"${cell}"` : cell).join(", ");
        return `      {${formattedRow}}`;
    }).join(",\n");
};

// Xal sistemini C++ struct massivinə çevirən funksiya
const xalSistemiToCpp = (xalSistemi: CavabXal[]): string => {
    return xalSistemi.map(item => `      {"${item.cavab}", ${item.verilecekXal}, "${item.mesaj}"}`).join(",\n");
};

const requiredWritesToCpp = (writes: RequiredWrite[]): string => {
    return writes.map(item => `      {${item.x}, ${item.y}, "${item.expected}", false}`).join(",\n");
};

export const generateEngineHeader = (levelData: LevelData): string => {
    const cppLayoutStr = matrixToCppString(levelData.mapLayout, false);
    const cppYazilarStr = matrixToCppString(levelData.xanaYazilari, true);
    const cppTiplerStr = matrixToCppString(levelData.xanaTipleri, true);

    const xalSistemiArray = levelData.xalSistemi || [];
    const xalSistemiLength = xalSistemiArray.length;
    const cppXalSistemiStr = xalSistemiLength > 0 ? xalSistemiToCpp(xalSistemiArray) : "";

    const writesArray = levelData.requiredWrites || [];
    const writesLength = writesArray.length;
    const cppRequiredWritesStr = writesLength > 0 ? requiredWritesToCpp(writesArray) : "";

    const hasTerminal = levelData.mapLayout.some(row => row.includes(4));

    const map_width = levelData.mapLayout[0].length;
    const map_height = levelData.mapLayout.length;

    return `#include <iostream>
#include <string>
#include <vector>

using namespace std;

namespace SehirliMese {
    const int MAP_WIDTH = ${map_width};
    const int MAP_HEIGHT = ${map_height};
    const int MAKSIMUM_BAL = ${levelData.levelPoint};

    struct CavabXal {
        string cavab; // Səhvsiz müqayisə üçün string formatı
        int verilecekXal;
        string mesaj;
    };

    struct YaziTapsirigi {
        int x;
        int y;
        string gozlenilenCavab;
        bool tamamlandi;
    };

    int xerite[MAP_HEIGHT][MAP_WIDTH] = {
${cppLayoutStr}
    };

    string xanaYazilari[MAP_HEIGHT][MAP_WIDTH] = {
${cppYazilarStr}
    };

    string xanaTipleri[MAP_HEIGHT][MAP_WIDTH] = {
${cppTiplerStr}
    };

    const int XAL_SISTEMI_SIZE = ${xalSistemiLength};
    CavabXal xalSistemi[XAL_SISTEMI_SIZE > 0 ? XAL_SISTEMI_SIZE : 1] = {
${cppXalSistemiStr.length > 0 ? cppXalSistemiStr : "      {\"\", 0, \"\"}"}
    };

    bool tapsiriqVar = ${levelData.hasWriteTask ? "true" : "false"};
    const int TAPSIRIQ_SIZE = ${writesLength};
    YaziTapsirigi yaziTapsiriqlari[TAPSIRIQ_SIZE > 0 ? TAPSIRIQ_SIZE : 1] = {
${cppRequiredWritesStr.length > 0 ? cppRequiredWritesStr : "      {-1, -1, \"\", false}"}
    };

    bool xeritedeTerminalVar = ${hasTerminal ? "true" : "false"};

    struct RobotEngine {
        int x = ${levelData.startX};
        int y = ${levelData.startY};
        string istiqamet = "${levelData.startDirection.toUpperCase()}";
        
        bool finishAciq = !xeritedeTerminalVar; 
        int qazanilanXal = xeritedeTerminalVar ? 0 : MAKSIMUM_BAL; 
        bool oyunBitdi = false;

        void KilitVaziyyetiniYenile() {
            bool terminalYoxlanisi = !xeritedeTerminalVar || (xeritedeTerminalVar && finishAciq);
            
            bool yaziYoxlanisi = true;
            if (tapsiriqVar) {
                for (int i = 0; i < TAPSIRIQ_SIZE; i++) {
                    if (!yaziTapsiriqlari[i].tamamlandi) {
                        yaziYoxlanisi = false;
                        break;
                    }
                }
            }

            // Hər iki tapşırıq tamdırsa finiş qapısı kiliddən çıxır
            if (terminalYoxlanisi && yaziYoxlanisi) {
                finishAciq = true;
                if (qazanilanXal == 0 && !xeritedeTerminalVar) {
                    qazanilanXal = MAKSIMUM_BAL;
                }
            } else {
                finishAciq = false;
            }
        }

        void ireli() {
            if (oyunBitdi) return;

            int nextX = x, nextY = y;
            if (istiqamet == "RIGHT")      { nextX++; }
            else if (istiqamet == "LEFT")  { nextX--; }
            else if (istiqamet == "UP")    { nextY--; }
            else if (istiqamet == "DOWN")  { nextY++; }

            if (nextX >= MAP_WIDTH || nextX < 0 || nextY >= MAP_HEIGHT || nextY < 0) {
                cout << "XETA: Xəritədən kənara çıxmaq olmaz!" << endl;
                return;
            }

            int qarsidakiObyekt = xerite[nextY][nextX];

            if (qarsidakiObyekt == 1) {
                cout << "XETA: Divara dəydiniz, irəli gedə bilməzsiniz!" << endl;
                return;
            }

            if (qarsidakiObyekt >= 21 && qarsidakiObyekt <= 29 && qarsidakiObyekt % 2 != 0) {
                cout << "XETA: Dəmir qutu çox ağırdır, onu itələmək və ya üstündən keçmək olmaz!" << endl;
                return;
            }

            if (qarsidakiObyekt == 2) {
                int boxNextX = nextX, boxNextY = nextY;
                if (istiqamet == "RIGHT")      { boxNextX++; }
                else if (istiqamet == "LEFT")  { boxNextX--; }
                else if (istiqamet == "UP")    { boxNextY--; }
                else if (istiqamet == "DOWN")  { boxNextY++; }

                if (xerite[boxNextY][boxNextX] == 0) {
                    xerite[boxNextY][boxNextX] = 2;
                    xerite[nextY][nextX] = 0;
                    cout << "ANIMATION: qutu_itele" << endl; 
                } else {
                    cout << "XETA: Qutunun arxası dolu olduğu üçün itələmək qeyri-mümkündür!" << endl;
                    return;
                }
            }

            x = nextX;
            y = nextY;
            cout << "ireli" << endl;

            int cariXana = xerite[y][x];
            if (cariXana >= 10 && cariXana <= 19) {
                // Əgər cütdürsə (+1) hədəfidir (10->11), təkdirsə (-1) hədəfidir (11->10)
                int hedefPortalID = (cariXana % 2 == 0) ? (cariXana + 1) : (cariXana - 1);
                
                bool portalTapildi = false;
                // Bütün xəritəni skan edib qarşı portallı tapırıq
                for (int h = 0; h < MAP_HEIGHT; h++) {
                    for (int w = 0; w < MAP_WIDTH; w++) {
                        if (xerite[h][w] == hedefPortalID) {
                            x = w;
                            y = h;
                            portalTapildi = true;
                            cout << "ANIMATION: portal_jump|" << cariXana << "->" << hedefPortalID << endl;
                            break;
                        }
                    }
                    if (portalTapildi) break;
                }
            }

            // 🔹 Düymə Mexanikası (20-29 aralığındakı cüt ədədlər düymədir)
            if (cariXana >= 20 && cariXana <= 29 && cariXana % 2 == 0) {
                int hedefQutuID = cariXana + 1; // 20 -> 21 (Dəmir qutu)
                
                // Düymənin üzərindəki yazını oxuyuruq (Məsələn: "LEFT" və ya "RIGHT")
                // Sən bura variantlardan real istiqaməti inyeksiya edəcəksən!
                string qutuIstiqameti = xanaYazilari[y][x]; 

                int qutuCariX = -1, qutuCariY = -1;
                bool qutuTapildi = false;

                // 1. Xəritədən dəmir qutunun hal-hazırda harada olduğunu tapırıq
                for (int h = 0; h < MAP_HEIGHT; h++) {
                    for (int w = 0; w < MAP_WIDTH; w++) {
                        if (xerite[h][w] == hedefQutuID) {
                            qutuCariX = w;
                            qutuCariY = h;
                            qutuTapildi = true;
                            break;
                        }
                    }
                    if (qutuTapildi) break;
                }

                if (qutuTapildi && (qutuIstiqameti == "RIGHT" || qutuIstiqameti == "LEFT" || qutuIstiqameti == "UP" || qutuIstiqameti == "DOWN")) {
                    int qutuNextX = qutuCariX;
                    int qutuNextY = qutuCariY;

                    // 2. Yazıdan gələn istiqamətə görə növbəti koordinatı təyin edirik
                    if (qutuIstiqameti == "RIGHT")      { qutuNextX++; }
                    else if (qutuIstiqameti == "LEFT")  { qutuNextX--; }
                    else if (qutuIstiqameti == "UP")    { qutuNextY--; }
                    else if (qutuIstiqameti == "DOWN")  { qutuNextY++; }

                    // 3. TAM TƏHLÜKƏSİZLİK YOXLANIŞLARI (Sərhəd, Divar, Digər Obyektlər)
                    // Sərhəd yoxlanışı:
                    if (qutuNextX >= 0 && qutuNextX < MAP_WIDTH && qutuNextY >= 0 && qutuNextY < MAP_HEIGHT) {
                        
                        int qutuQarsisi = xerite[qutuNextY][qutuNextX];
                        
                        // Robotun öz yerini yoxlayırıq (Qutu robotun üstünə gedə bilməz)
                        bool robotVar = (qutuNextX == x && qutuNextY == y);

                        // Dəmir qutu YALNIZ boş xanaya (0) və ya başqa bir düymənin (20-29 cütləri) üzərinə gedə bilər.
                        // Divara (1), digər qutuya (2) və ya Finişə (5) dəyə bilməz.
                        bool yolAciqdir = (qutuQarsisi == 0 || (qutuQarsisi >= 20 && qutuQarsisi <= 29 && qutuQarsisi % 2 == 0));

                        if (yolAciqdir && !robotVar) {
                            // 3. Xəritədə qutunun yerini yeniləyirik
                            xerite[qutuCariY][qutuCariX] = 0; 
                            xerite[qutuNextY][qutuNextX] = hedefQutuID; 
                            
                            // Frontend animasiya üçün log
                            cout << "ANIMATION: iron_box_move|" << hedefQutuID << "|" << qutuCariX << "," << qutuCariY << "->" << qutuNextX << "," << qutuNextY << endl;
                        } else {
                            // Robot düyməyə təkrar-təkrar bassa və qutu divara dirənsə, bura girəcək
                            cout << "KONSOL: ⚠️ Dəmir qutu hərəkət edə bilmir, önü bloklanıb!" << endl;
                        }
                    } else {
                        cout << "KONSOL: ⚠️ Dəmir qutu xəritə xaricinə çıxa bilməz!" << endl;
                    }
                }
            }

            if (xerite[y][x] == 5) {
                if (finishAciq) {
                    cout << "KONSOL: Təbriklər! Səviyyə tamamlandı! 🎉 [Yekun Xalınız: " << qazanilanXal << "]" << endl;
                    oyunBitdi = true;
                } else {
                    cout << "KONSOL: Finiş kilidlidir! Öncə Terminala keçərli bir cavab yazmalısınız! ❌" << endl;
                }
            }
        }

        void saga() { 
            cout << "saga" << endl; 
            if (istiqamet == "RIGHT")       istiqamet = "DOWN"; 
            else if (istiqamet == "DOWN")   istiqamet = "LEFT"; 
            else if (istiqamet == "LEFT")   istiqamet = "UP"; 
            else if (istiqamet == "UP")     istiqamet = "RIGHT"; 
        }

        void sola() { 
            cout << "sola" << endl; 
            if (istiqamet == "RIGHT")       istiqamet = "UP"; 
            else if (istiqamet == "UP")     istiqamet = "LEFT"; 
            else if (istiqamet == "LEFT")   istiqamet = "DOWN"; 
            else if (istiqamet == "DOWN")   istiqamet = "RIGHT"; 
        }

        string ondeNeVar() {
            int nextX = x, nextY = y;
            if (istiqamet == "RIGHT")      { nextX++; }
            else if (istiqamet == "LEFT")  { nextX--; }
            else if (istiqamet == "UP")    { nextY--; }
            else if (istiqamet == "DOWN")  { nextY++; }

            cout << "ANIMATION: onde_ne_var" << endl;

            if (nextX >= MAP_WIDTH || nextX < 0 || nextY >= MAP_HEIGHT || nextY < 0) return "divar";
            int obyekt = xerite[nextY][nextX];
            if (obyekt == 1) return "divar";
            if (obyekt == 2) return "qutu";
            if (obyekt == 5) return "cixis";
            if (obyekt >= 21 && obyekt <= 29 && obyekt % 2 != 0) return "demir_qutu";
            if (xanaTipleri[nextY][nextX] != "") return "yazi";
            return "";
        }

        int yaziOxuInt() {
            int nextX = x, nextY = y;
            if (istiqamet == "RIGHT")      { nextX++; }
            else if (istiqamet == "LEFT")  { nextX--; }
            else if (istiqamet == "UP")    { nextY--; }
            else if (istiqamet == "DOWN")  { nextY++; }

            if (xanaTipleri[nextY][nextX] != "int") {
                cout << "XETA: Ön xanadakı məlumat tipi INT deyil!" << endl;
                return 0;
            }
            cout << "ANIMATION: yazi_oxu_int" << endl;
            return stoi(xanaYazilari[nextY][nextX]);
        }

        string yaziOxuString() {
            int nextX = x, nextY = y;
            if (istiqamet == "RIGHT")      { nextX++; }
            else if (istiqamet == "LEFT")  { nextX--; }
            else if (istiqamet == "UP")    { nextY--; }
            else if (istiqamet == "DOWN")  { nextY++; }

            if (xanaTipleri[nextY][nextX] != "string") {
                cout << "XETA: Ön xanadakı məlumat tipi STRING deyil!" << endl;
                return "";
            }
            cout << "ANIMATION: yazi_oxu_string" << endl;
            return xanaYazilari[nextY][nextX];
        }

        double yaziOxuDouble() {
            int nextX = x, nextY = y;
            if (istiqamet == "RIGHT")      { nextX++; }
            else if (istiqamet == "LEFT")  { nextX--; }
            else if (istiqamet == "UP")    { nextY--; }
            else if (istiqamet == "DOWN")  { nextY++; }

            if (xanaTipleri[nextY][nextX] != "double") {
                cout << "XETA: Ön xanadakı məlumat tipi DOUBLE deyil!" << endl;
                return 0.0;
            }
            cout << "ANIMATION: yazi_oxu_double" << endl;
            return stod(xanaYazilari[nextY][nextX]);
        }
      
        void yaziYaz(int eded) {
            xanaTipleri[y][x] = "int";
            xanaYazilari[y][x] = to_string(eded);
            XanaYazisiniYoxla(to_string(eded));
        }

        void yaziYaz(double kəsr) {
            xanaTipleri[y][x] = "double";
            string s = to_string(kəsr);
            s.erase(s.find_last_not_of('0') + 1, string::npos);
            if(s.back() == '.') s.pop_back();
            xanaYazilari[y][x] = s;
            XanaYazisiniYoxla(s);
        }

        void yaziYaz(string soz) {
            xanaTipleri[y][x] = "string"; // 👈 Tip anında string olaraq qeyd edilir!
            xanaYazilari[y][x] = soz;
            XanaYazisiniYoxla(soz);
        }
       
        void terminalaYaz(int netice) {
            TerminalKoduYoxla(to_string(netice));
        }

        void terminalaYaz(double netice) {
            // .00000 dəqiqliyi təmizləmək üçün lazımsız sıfırları kəsirik
            string s = to_string(netice);
            s.erase(s.find_last_not_of('0') + 1, string::npos);
            if(s.back() == '.') s.pop_back();
            TerminalKoduYoxla(s);
        }

        void terminalaYaz(string mesaj) {
            TerminalKoduYoxla(mesaj);
        }

    private:
        void XanaYazisiniYoxla(string deyer) {
            if (oyunBitdi) return;

            cout << "ANIMATION: yazi_yaz|" << deyer << endl;

            if (tapsiriqVar) {
                for (int i = 0; i < TAPSIRIQ_SIZE; i++) {
                    if (yaziTapsiriqlari[i].x == x && yaziTapsiriqlari[i].y == y) {
                        if (yaziTapsiriqlari[i].gozlenilenCavab == deyer) {
                            yaziTapsiriqlari[i].tamamlandi = true;
                            cout << "KONSOL: [Xana " << x << "," << y << "] Düzgün məlumat yazıldı! ✨" << endl;
                        } else {
                            yaziTapsiriqlari[i].tamamlandi = false;
                            cout << "KONSOL: ⚠️ [Xana " << x << "," << y << "] Səhv məlumat! Gözlənilən: " << yaziTapsiriqlari[i].gozlenilenCavab << endl;
                        }
                        break;
                    }
                }
            }
            KilitVaziyyetiniYenile();
        }

        // 🛠️ Bütün overloading bura bağlanır - Tam Təhlükəsiz Yoxlama
        void TerminalKoduYoxla(string daxilEdilenCavab) {
            if (!xeritedeTerminalVar) {
                cout << "KONSOL: Səviyyədə Terminal yoxdur, bu əmri istifadə edə bilməzsiniz!" << endl;
                return;
            }

            if (xerite[y][x] != 4) {
                cout << "KONSOL: XƏTA! Terminala yazmaq üçün Terminal xanasının üzərinə gəlməlisiniz!" << endl;
                return;
            }

            cout << "ANIMATION: terminala_yaz" << endl;            
            cout << "TERMINAL LOG: " << daxilEdilenCavab << endl;

            bool cavabTapildi = false;
            for (int i = 0; i < XAL_SISTEMI_SIZE; i++) {
                if (xalSistemi[i].cavab == daxilEdilenCavab) {
                    qazanilanXal = xalSistemi[i].verilecekXal;
                    finishAciq = true; 
                    cavabTapildi = true;
                    cout << "KONSOL: " << xalSistemi[i].mesaj << " (+" << qazanilanXal << " Bal)" << endl;
                    break;
                }
            }

            if (!cavabTapildi) {
                qazanilanXal = 0; 
                finishAciq = false; // Səhv cavab yazdıqda finiş yenidən bağlansın
                cout << "KONSOL: ⚠️ Daxil edilən nəticə heç bir missiya hədəfinə uyğun gəlmədi! (0 Bal)" << endl;
            }
        }
    };

    RobotEngine robot;
}

auto& robot = SehirliMese::robot;
`;
};