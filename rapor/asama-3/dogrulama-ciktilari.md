# Aşama 3 · Redis doğrulaması

Tarih: 13 Kasım 2026 · Windows PowerShell 5.1 · Docker Compose

İstekler `http://localhost:8080/api` adresine (Apache → uygulama) gönderildi. Redis komutları
`docker compose exec redis redis-cli ...` ile çalıştırıldı. Oturum anahtarları güvenlik için kısaltıldı
(`oturum:14482ddc380e...`).

## Özet

| #   | Kontrol                                         | Beklenen                                                    | Sonuç |
| --- | ----------------------------------------------- | ----------------------------------------------------------- | ----- |
| 1   | Uygulama Redis'e bağlanıyor                      | `[redis] redis:6379 bağlandı`, sağlıkta `"redis":"ok"`      | Geçti |
| 2   | Menü ilk istekte veritabanından, sonra Redis'ten | Günlükte `veritabanından geldi (replika)`, sonra `Redis'ten geldi` | Geçti |
| 3   | Menü kaydı menünün günü bitince silinir          | `EXPIRETIME` = menü gününün 23:59:59'u                       | Geçti |
| 4   | Yönetici menüyü değiştirince önbellek yenilenir  | `silindi (vardı)`, kaynaktan yeniden yüklenir, yeni fiyat görünür | Geçti |
| 5   | Oturum bellekteyken uygulama yeniden başlarsa    | Oturum düşer (401)                                           | Geçti |
| 6   | Oturum Redis'teyken uygulama yeniden başlarsa    | Oturum devam eder (200)                                      | Geçti |
| 7   | Oturum süresi 30 dk, her istekte yenilenir       | `TTL` 1800 → azalır → istekten sonra yine 1800               | Geçti |
| 8   | Çıkışta oturum silinir                           | `EXISTS` = 0                                                 | Geçti |
| 9   | Yazmadan sonra 5 sn kaynaktan okuma sürüyor      | `sonYazma` Redis'e yazılır; `kaynak: yazma` → 6 sn sonra `okuma` | Geçti |

---

## 1. Redis bağlantısı

```
PS> docker compose logs uygulama
uygulama-1  | [redis] redis:6379 bağlandı
uygulama-1  | [uygulama] 8000 portunda dinleniyor
uygulama-1  | [uygulama] yazma: mysql-primary, okuma: mysql-replica

PS> Invoke-RestMethod http://localhost:8080/api/saglik
{"db":{"yazma":"ok","okuma":"ok"},"redis":"ok"}
```

Uygulama önce Redis'e bağlanıyor, bağlantı kurulamazsa hiç başlamıyor. Bağlantı koparsa istemci
en fazla 3 saniye arayla yeniden deniyor.

## 2. Menü önbelleği: ilk istek veritabanından, sonrakiler Redis'ten

Aynı günlük menü (Merkez Yemekhane, 14 Kasım, Öğle) üç kez istendi:

```
[önbellek] menu:1:2026-11-14:2 -> veritabanından geldi (replika)
GET /api/menuler/gunluk?yemekhane_id=1&tarih=2026-11-14&ogun_id=2 -> 200 (6 ms)
[önbellek] menu:1:2026-11-14:2 -> Redis'ten geldi
GET /api/menuler/gunluk?yemekhane_id=1&tarih=2026-11-14&ogun_id=2 -> 200 (4 ms)
[önbellek] menu:1:2026-11-14:2 -> Redis'ten geldi
GET /api/menuler/gunluk?yemekhane_id=1&tarih=2026-11-14&ogun_id=2 -> 200 (4 ms)
```

Redis'teki kayıt:

```
> redis-cli --scan --pattern 'menu:*'
menu:1:2026-11-14:2
> redis-cli GET menu:1:2026-11-14:2
{"menu_id":80,"tarih":"2026-11-14","yemekhane_id":1,"yemekhane":"Merkez Yemekhane","ogun_id":2,"ogun":"Öğle","rezervasyon_son":"2026-11-14 10:00:00","ogrenci_fiyati":40,"personel_fiyati":90,"toplam_kalori":1180,"tamami_vejetaryen":false,"yemekler":[{"yemek_id":1,"yemek":"Mercimek Çorbası","kategori":"Çorba","kategori_sira":1,"kalori":180,"vejetaryen":true,"alerjenler":["Kereviz"],"alerjen_idler":[9]},{"yemek_id":11,"yemek":"Izgara Köfte","kategori":"Ana Yemek","kategori_sira":2,"kalori":450,"vejetaryen":false,"alerjenler":["Gluten","Yumurta"],"alerjen_idler":[1,3]},{"yemek_id":26,"yemek":"Su Böreği","kategori":"Yardımcı Yemek","kategori_sira":3,"kalori":400,"vejetaryen":true,"alerjenler":["Gluten","Süt","Yumurta"],"alerjen_idler":[1,3,7]},{"yemek_id":30,"yemek":"Mevsim Salata","kategori":"Salata ve Meze","kategori_sira":4,"kalori":80,"vejetaryen":true,"alerjenler":["Hardal"],"alerjen_idler":[10]},{"yemek_id":50,"yemek":"Ayran","kategori":"İçecek","kategori_sira":7,"kalori":70,"vejetaryen":true,"alerjenler":["Süt"],"alerjen_idler":[7]}]}
```

Önbellekte yalnızca gün içinde değişmeyen bilgi var: yemekler, kalori, alerjenler, fiyatlar.
Boş yer sayısı ve kullanıcının rezervasyonu her istekte veritabanından okunuyor, çünkü bunlar
her rezervasyonda değişiyor.

## 3. Menü kaydının süresi

```
> redis-cli TTL menu:1:2026-11-14:2
92413
> redis-cli EXPIRETIME menu:1:2026-11-14:2
1794689999   (2026-11-14 23:59:59 +03:00)
```

Kayıt, menünün günü bitince (İstanbul saatiyle 23:59:59) Redis'ten kendiliğinden siliniyor.
Geçmiş bir günün menüsü istenirse kayıt bugünün sonuna kadar tutuluyor.

## 4. Yönetici menüyü değiştirince

Menü #85 (Merkez Yemekhane, 15 Kasım, Öğle) önce okundu, ardından yönetici personel fiyatını 100 TL'den 95 TL'ye
indirdi, sonra menü yeniden okundu:

```
once: personel fiyati 100
Menü güncellendi.
sonra: personel fiyati 95

[önbellek] menu:1:2026-11-15:2 -> Redis'ten geldi
GET /api/menuler/gunluk?yemekhane_id=1&tarih=2026-11-15&ogun_id=2 -> 200 (7 ms)
GET /api/yonetim/menuler/85 -> 200 (4 ms)
[önbellek] menu:1:2026-11-15:2 silindi (vardı)
[önbellek] menu:1:2026-11-15:2 -> veritabanından geldi (kaynak)
PUT /api/yonetim/menuler/85 -> 200 (31 ms)
[önbellek] menu:1:2026-11-15:2 -> Redis'ten geldi
GET /api/menuler/gunluk?yemekhane_id=1&tarih=2026-11-15&ogun_id=2 -> 200 (4 ms)
```

Güncellemeden sonra eski kayıt silinip menü **kaynak** veritabanından yeniden okunuyor ve Redis'e
yazılıyor. Replikadan okunsaydı, replika birkaç milisaniye geride kaldığında eski fiyat okunup
gün sonuna kadar önbellekte kalabilirdi.

## 5–6. Uygulama yeniden başlayınca oturum

**Önce: oturum uygulamanın belleğindeyken** (commit `de4b524`)

```
1) giris yapildi: Mehmet Yıldız
   GET /api/oturum/ben -> 200, Mehmet Yıldız
2) docker compose restart uygulama
3) ayni cerezle tekrar:
   GET /api/oturum/ben -> 401
```

**Sonra: oturum Redis'teyken** (commit `6b91ff1`)

```
1) giris yapildi: Mehmet Yıldız
   GET /api/oturum/ben -> 200, Mehmet Yıldız
2) docker compose restart uygulama
3) ayni cerezle tekrar:
   GET /api/oturum/ben -> 200, Mehmet Yıldız
```

Bellekteki oturumlar uygulama süreciyle birlikte siliniyordu; herkes yeniden giriş yapmak zorunda
kalıyordu. Redis ayrı bir container olduğu için uygulama yeniden başlasa da oturumlar duruyor.
Birden fazla uygulama container'ı çalıştırılsaydı hepsi aynı oturumları görebilirdi.

## 7–8. Oturum kaydı, süre yenileme ve çıkış

```
> redis-cli --scan --pattern 'oturum:*'
oturum:14482ddc380e...
> redis-cli GET oturum:14482ddc380e...
{"id":7,"ad":"Mehmet","soyad":"Yıldız","eposta":"mehmet.yildiz@ogr.kampus.edu.tr","rol":"ogrenci","sonYazma":0}
> redis-cli TTL oturum:14482ddc380e...
1799
(5 saniye bekleniyor)
> redis-cli TTL oturum:14482ddc380e...
1793
GET /api/oturum/ben gonderildi
> redis-cli TTL oturum:14482ddc380e...
1800
POST /api/oturum/cikis gonderildi
> redis-cli EXISTS oturum:14482ddc380e...
0
```

Oturumda şifre ya da bakiye tutulmuyor. Süre her istekte `GETEX ... EX 1800` ile 30 dakikaya
yenileniyor; kullanıcı 30 dakika hiç istek göndermezse Redis kaydı kendisi siliyor.

## 9. Yazmadan sonra kaynaktan okuma

```
POST /api/bakiye/yukle -> Bakiye yüklendi. bakiye 715
> redis-cli GET oturum:...
{"id":7,"ad":"Mehmet","soyad":"Yıldız","eposta":"mehmet.yildiz@ogr.kampus.edu.tr","rol":"ogrenci","sonYazma":1794597541894}
GET /api/bakiye -> kaynak: yazma
(6 saniye sonra) GET /api/bakiye -> kaynak: okuma
```

Kullanıcı bir şey yazdığında son yazma zamanı oturuma kaydediliyor (`SET ... KEEPTTL XX`: süreye
dokunmadan, oturum hâlâ varsa). Sonraki 5 saniye boyunca o kullanıcının verisi kaynaktan okunuyor,
böylece replikasyon gecikmesi yüzünden eski bakiye görünmüyor.
