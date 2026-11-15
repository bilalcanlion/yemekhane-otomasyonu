# Aşama 4 · Değişiklik talebi doğrulaması

Tarih: 15 Kasım 2026 · Windows PowerShell 5.1 · Docker Compose

Yemekhane Müdürlüğü'nün iki isteği **sistem çalışırken** uygulandı:

- **Yarım porsiyon:** Öğle ve akşamda seçilebilir, ücret tam fiyatın %60'ı. Kahvaltıda yok. Geçmiş rezervasyonlar tam sayılır.
- **Alerjen uyarısı:** Kullanıcı profilinde alerjenlerini seçer, menüde bu alerjenleri içeren yemekler uyarıyla gösterilir.

## Özet

| #   | Kontrol                                                 | Beklenen                                                       | Sonuç |
| --- | ------------------------------------------------------- | -------------------------------------------------------------- | ----- |
| 1   | Migration kaynakta, çalışan sistemde hatasız çalışır     | Çıkış kodu 0                                                    | Geçti |
| 2   | Değişiklik replikaya geçer                               | Replikada `SHOW CREATE TABLE` yeni sütun ve tabloyu gösterir   | Geçti |
| 3   | Mevcut veri bozulmaz                                     | Rezervasyon sayısı, toplam ücret ve bakiyeler aynı; uyumsuzluk 0 | Geçti |
| 4   | Geçmiş rezervasyonlar tam porsiyon sayılır               | 370 rezervasyonun 370'i `tam`                                  | Geçti |
| 5   | Redis'teki eski yapıdaki menü kayıtları temizlenir       | Temizlikten önce yarım fiyat yok, sonra var                     | Geçti |
| 6   | Öğle/akşamda yarım porsiyon %60                          | 40 → 24, 45 → 27, personel 100 → 60                            | Geçti |
| 7   | Kahvaltıda yarım porsiyon yok                            | "Bu öğünde yarım porsiyon yoktur."                             | Geçti |
| 8   | Profilde alerjen seçimi                                  | Kaydet, temizle, geçersiz seçim reddedilir                     | Geçti |
| 9   | Menüde alerjen uyarısı                                   | Alerjen içeren yemekler işaretlenir                            | Geçti |
| 10  | Sıfırdan kurulumda migration kendiliğinden çalışır       | `docker compose up -d` ile `04_degisiklik.sql` çalışır         | Geçti |

---

## 1. Migration dosyası: `db/init/04_degisiklik.sql`

| Değişiklik | Neden |
| --- | --- |
| `ogunler.yarim_porsiyon_orani DECIMAL(3,2) NULL` (Öğle ve Akşam 0.60, Kahvaltı NULL) | "Kahvaltıda yarım yok" kuralı kodda değil veride duruyor. Oran değişirse kod değişmiyor. |
| `rezervasyonlar.porsiyon ENUM('tam','yarim') NOT NULL DEFAULT 'tam'` | Varsayılan `tam` olduğu için eski satırların hepsi kendiliğinden tam porsiyon sayılıyor. |
| Yeni tablo `kullanici_alerjenleri (kullanici_id, alerjen_id)` | Kullanıcı ile alerjen arasında çoka çok ilişki. Kullanıcı silinirse kayıtları da siliniyor (`ON DELETE CASCADE`). |
| `v_menu_detay` view'ına `ogrenci_yarim_fiyati`, `personel_yarim_fiyati` | Arayüz yarım fiyatı rezervasyondan önce gösterebilsin; hesap veritabanında yapılıyor. |
| `sp_rezervasyon_yap(kullanici_id, menu_id, porsiyon)` | Yeni parametre. Yarım porsiyonun ücretini hesaplıyor, kahvaltıda yarımı reddediyor. |

Yordamdaki yeni kurallar:

```sql
IF v_porsiyon NOT IN ('tam', 'yarim') THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Geçersiz porsiyon seçimi.';
...
IF v_porsiyon = 'yarim' AND v_oran IS NULL THEN
    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Bu öğünde yarım porsiyon yoktur.';
...
IF v_porsiyon = 'yarim' THEN
    SET v_ucret = ROUND(v_ucret * v_oran, 2);
```

İptalde ayrıca bir değişiklik gerekmedi: `sp_rezervasyon_iptal` zaten rezervasyondaki `ucret` değerini iade ediyor,
yarım porsiyonda bu değer yarım ücret oluyor.

## 2. Önce: replikadaki tablo ve mevcut veri

```
PS> docker compose exec mysql-replica mysql -uroot -pyemekhane_kok yemekhane -e "SHOW CREATE TABLE rezervasyonlar\G"
Create Table: CREATE TABLE `rezervasyonlar` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `kullanici_id` int unsigned NOT NULL,
  `menu_id` int unsigned NOT NULL,
  `durum` enum('aktif','kullanildi','iptal') ... NOT NULL DEFAULT 'aktif',
  `ucret` decimal(8,2) NOT NULL,
  `olusturma` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `kullanma_zamani` datetime DEFAULT NULL,
  `iptal_zamani` datetime DEFAULT NULL,
  ...
) ENGINE=InnoDB AUTO_INCREMENT=371 ...

PS> ... -e "SHOW TABLES LIKE 'kullanici_alerjenleri'"
(boş: tablo yok)
```

Kaynakta veri özeti:

```
rezervasyon_sayisi  toplam_ucret  aktif  kullanildi  iptal
370                 16340.00      156    167         47

kullanici_sayisi  toplam_bakiye
30                10097.50

bakiyesi_hareketlerle_uyusmayan
0
```

## 3. Migration'ı çalışan sistemde kaynağa uygulama

```
PS> cmd /c "docker compose exec -T mysql-primary mysql -uroot -pyemekhane_kok yemekhane < db\init\04_degisiklik.sql"
mysql: [Warning] Using a password on the command line interface can be insecure.
PS> $LASTEXITCODE
0
```

Windows PowerShell 5.1'de `<` yönlendirmesi olmadığı için komut `cmd /c` ile çalıştırıldı. PowerShell'in
kendi borusu (`Get-Content | ...`) Türkçe karakterleri bozabildiği için kullanılmadı. Linux/macOS'ta:
`docker compose exec -T mysql-primary mysql -uroot -pyemekhane_kok yemekhane < db/init/04_degisiklik.sql`

Replikaya ayrıca bir şey uygulanmadı; değişiklik replikasyonla geçti.

## 4. Sonra: değişikliğin replikaya geçtiğinin kanıtı

```
PS> docker compose exec mysql-replica mysql -uroot -pyemekhane_kok yemekhane -e "SHOW CREATE TABLE rezervasyonlar\G"
Create Table: CREATE TABLE `rezervasyonlar` (
  `id` int unsigned NOT NULL AUTO_INCREMENT,
  `kullanici_id` int unsigned NOT NULL,
  `menu_id` int unsigned NOT NULL,
  `durum` enum('aktif','kullanildi','iptal') CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_ai_ci NOT NULL DEFAULT 'aktif',
  `porsiyon` enum('tam','yarim') COLLATE utf8mb4_tr_0900_ai_ci NOT NULL DEFAULT 'tam',
  `ucret` decimal(8,2) NOT NULL,
  `olusturma` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `kullanma_zamani` datetime DEFAULT NULL,
  `iptal_zamani` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_rezervasyon` (`kullanici_id`,`menu_id`),
  KEY `ix_rezervasyon_menu_durum` (`menu_id`,`durum`),
  CONSTRAINT `fk_rez_kullanici` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar` (`id`),
  CONSTRAINT `fk_rez_menu` FOREIGN KEY (`menu_id`) REFERENCES `menuler` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=371 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_ai_ci

PS> ... -e "SHOW CREATE TABLE kullanici_alerjenleri\G"
Create Table: CREATE TABLE `kullanici_alerjenleri` (
  `kullanici_id` int unsigned NOT NULL,
  `alerjen_id` tinyint unsigned NOT NULL,
  PRIMARY KEY (`kullanici_id`,`alerjen_id`),
  KEY `fk_ka_alerjen` (`alerjen_id`),
  CONSTRAINT `fk_ka_alerjen` FOREIGN KEY (`alerjen_id`) REFERENCES `alerjenler` (`id`),
  CONSTRAINT `fk_ka_kullanici` FOREIGN KEY (`kullanici_id`) REFERENCES `kullanicilar` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_ai_ci

PS> ... -e "SHOW CREATE TABLE ogunler\G"
Create Table: CREATE TABLE `ogunler` (
  `id` tinyint unsigned NOT NULL,
  `ad` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_tr_0900_ai_ci NOT NULL,
  `sira` tinyint unsigned NOT NULL,
  `son_saat` time NOT NULL,
  `servis_baslangic` time NOT NULL,
  `servis_bitis` time NOT NULL,
  `yarim_porsiyon_orani` decimal(3,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_ogun_ad` (`ad`),
  CONSTRAINT `ck_ogun_yarim_oran` CHECK (((`yarim_porsiyon_orani` is null) or ((`yarim_porsiyon_orani` > 0) and (`yarim_porsiyon_orani` < 1))))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_tr_0900_ai_ci

PS> docker compose exec mysql-replica mysql --default-character-set=utf8mb4 -uroot -pyemekhane_kok yemekhane -e "SELECT id, ad, yarim_porsiyon_orani FROM ogunler; SELECT PARAMETER_NAME, DATA_TYPE FROM information_schema.PARAMETERS WHERE SPECIFIC_SCHEMA='yemekhane' AND SPECIFIC_NAME='sp_rezervasyon_yap' ORDER BY ORDINAL_POSITION;"
id  ad        yarim_porsiyon_orani
1   Kahvaltı  NULL
2   Öğle      0.60
3   Akşam     0.60

PARAMETER_NAME  DATA_TYPE
p_kullanici_id  int
p_menu_id       int
p_porsiyon      varchar

PS> docker compose exec mysql-replica mysql -uroot -pyemekhane_kok -e "SHOW REPLICA STATUS\G"
           Replica_IO_Running: Yes
          Replica_SQL_Running: Yes
        Seconds_Behind_Source: 0
               Last_SQL_Error:
```

## 5. Mevcut veri bozulmadı

Migration'dan sonra kaynakta aynı özet:

```
rezervasyon_sayisi  toplam_ucret  aktif  kullanildi  iptal
370                 16340.00      156    167         47

kullanici_sayisi  toplam_bakiye
30                10097.50

bakiyesi_hareketlerle_uyusmayan
0

PS> ... (replika) -e "SELECT porsiyon, COUNT(*) FROM rezervasyonlar GROUP BY porsiyon"
porsiyon  COUNT(*)
tam       370
```

Hiçbir satır silinmedi ya da değişmedi. Eski 370 rezervasyonun hepsi `tam` porsiyon sayıldı.

## 6. Yayın sırası

1. `04_degisiklik.sql` kaynağa uygulanır (replikaya kendisi geçer).
2. Uygulama yeni kodla yeniden kurulur: `docker compose up -d --build uygulama`.
3. Redis'teki eski yapıdaki menü kayıtları silinir.

1 ile 2 arasında eski uygulama yordamı iki parametreyle çağırdığı için rezervasyon birkaç saniye hata verir.
Diğer ekranlar çalışmaya devam eder. Temizlik 2'den **sonra** yapılmalıdır; önce yapılırsa eski uygulama
menüleri yine eski yapıda önbelleğe yazabilir.

## 7. Redis'te eski yapıdaki menü kayıtlarının temizlenmesi

Önbellekteki menü nesnesine yarım porsiyon fiyatları eklendi. Migration'dan önce yazılmış kayıtlarda bu alanlar
yok. Yeni uygulama böyle bir kaydı Redis'ten okursa öğle menüsünde yarım porsiyonu göstermiyor:

```
> redis-cli GET menu:1:2026-11-15:2
{"menu_id":85,"tarih":"2026-11-15",...,"ogrenci_fiyati":40,"personel_fiyati":95,"toplam_kalori":930,...}
                                         (ogrenci_yarim_fiyati / personel_yarim_fiyati yok)

GET /api/menuler/gunluk (15 Kasim, Ogle) -> porsiyonlar: Tam porsiyon 40 TL
[önbellek] menu:1:2026-11-15:2 -> Redis'ten geldi
```

Temizlik (oturumlara dokunmadan yalnızca `menu:*` anahtarları):

```
PS> docker compose exec redis sh -c "redis-cli --scan --pattern 'menu:*' | xargs -r redis-cli DEL"
> redis-cli --scan --pattern 'menu:*'
menu:1:2026-11-15:2
> redis-cli --scan --pattern 'menu:*' | xargs -r redis-cli DEL
1
> redis-cli --scan --pattern 'menu:*'
(boş)

GET /api/menuler/gunluk (15 Kasim, Ogle) -> porsiyonlar: Tam porsiyon 40 TL | Yarım porsiyon 24 TL
[önbellek] menu:1:2026-11-15:2 -> veritabanından geldi (replika)
```

`KEYS` yerine `SCAN` kullanıldı; `KEYS` büyük bir Redis'te sunucuyu bir süre kilitleyebilir.

## 8. Yarım porsiyon kuralları (API)

16 Kasım için yönetici panelinden üç menü oluşturuldu (#95 Kahvaltı, #96 Öğle, #97 Akşam):

```
haftalik Kahvaltı: tam=30
haftalik Öğle: tam=40, yarim=24
haftalik Akşam: tam=45, yarim=27
ogrenci kahvalti yarim -> 400 Bu öğünde yarım porsiyon yoktur.
ogrenci ogle 'ceyrek' -> 400 Geçersiz porsiyon seçimi.
ogrenci ogle yarim -> 201 Rezervasyonunuz alındı. porsiyon=yarim ucret=24 bakiye=691
ogrenci kahvalti (porsiyon yok -> tam) -> 201 porsiyon=tam ucret=30 bakiye=661
liste #371 Öğle: porsiyon=yarim ucret=24
liste #372 Kahvaltı: porsiyon=tam ucret=30
hareket: Rezervasyon -30
hareket: Rezervasyon (yarım porsiyon) -24
ogle yarim iptal -> 200 iade=24 bakiye=685
iptalden sonra ayni menu tam -> 201 porsiyon=tam ucret=40 (ayni kayit #371)
personel aksam yarim (100 TL x 0.60) -> 201 ucret=60
```

Replikadaki view, yarım fiyatları rol bazında gösteriyor:

```
menu_id  ogun      ogrenci_fiyati  ogrenci_yarim_fiyati  personel_fiyati  personel_yarim_fiyati
95       Kahvaltı  30.00           NULL                  60.00            NULL
96       Öğle      40.00           24.00                 95.00            57.00
97       Akşam     45.00           27.00                 100.00           60.00
```

## 9. Alerjen seçimi ve menüde uyarı (API)

```
GET /api/profil -> 200, Mehmet Yıldız, 14 alerjen, secili: []
olmayan alerjen 99 -> 400 Geçersiz alerjen seçimi.
aralik disi alerjen 300 -> 400 Geçersiz alerjen seçimi.
liste yerine metin -> 400 Geçersiz alerjen listesi.
Gluten(1) ve Sut(7) kaydet -> 200 Alerjenleriniz kaydedildi. [1,7]
gunluk 16 Kasim Ogle -> alerjen_uyarisi: 3
  Mercimek Çorbası: alerjenler [Kereviz] -> uyari []
  Izgara Köfte: alerjenler [Gluten, Yumurta] -> uyari [Gluten]
  Su Böreği: alerjenler [Gluten, Süt, Yumurta] -> uyari [Gluten, Süt]
  Mevsim Salata: alerjenler [Hardal] -> uyari []
  Ayran: alerjenler [Süt] -> uyari [Süt]
haftalik Kahvaltı: uyari_yemekler [Ayran]
haftalik Öğle: uyari_yemekler [Ayran, Izgara Köfte, Su Böreği]
haftalik Akşam: uyari_yemekler [Ayran]
bos liste -> 200 Alerjen listeniz temizlendi.
gunluk (alerjen yok) -> alerjen_uyarisi: 0
```

Menü Redis'te herkes için aynı tutuluyor; kullanıcıya özel uyarı her istekte sunucuda hesaplanıyor
(`menuServisi.alerjenUyarilari`). Böylece önbellek kullanıcıya göre bölünmüyor. Kullanıcı alerjenlerini
kaydettikten sonraki 5 saniye listesi kaynaktan okunduğu için uyarı hemen görünüyor.

## 10. Sıfırdan kurulum

Ana sistem durduruldu (`docker compose stop`, veriler silinmeden), ayrı adla boş bir kopya kuruldu:

```
PS> docker compose -p yemekhanetest up -d --build
SERVICE         STATUS
frontend        Up 37 seconds (healthy)
mysql-primary   Up 36 seconds (healthy)
mysql-replica   Up 37 seconds (healthy)
redis           Up 37 seconds (healthy)
replica-setup   Exited (0) 4 seconds ago
uygulama        Up 3 seconds

[Entrypoint]: running /docker-entrypoint-initdb.d/01_sema.sql
[Entrypoint]: running /docker-entrypoint-initdb.d/02_ornek_veri.sql
[Entrypoint]: running /docker-entrypoint-initdb.d/04_degisiklik.sql
[replica-setup] Replikasyon çalışıyor (IO=Yes, SQL=Yes). Replika salt okunur.

(replika) SELECT id, ad, yarim_porsiyon_orani FROM ogunler
1  Kahvaltı  NULL
2  Öğle      0.60
3  Akşam     0.60
(replika) SELECT porsiyon, COUNT(*) FROM rezervasyonlar GROUP BY porsiyon
tam  367
(replika) SHOW TABLES LIKE 'kullanici_alerjenleri'
kullanici_alerjenleri

haftalik: 21 menu; ornek 2026-11-15 Akşam: Tam 40 | Yarım 24
yarim rezervasyon -> porsiyon=yarim ucret=24
GET /api/profil -> 200

PS> docker compose -p yemekhanetest down -v
PS> docker compose up -d
```

Depoyu yeni indiren biri ek bir adım yapmadan `docker compose up -d` ile Aşama 4 dahil tüm sistemi alıyor.
