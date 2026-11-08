# Aşama 1 · Altyapı doğrulaması

Tarih: 8 Kasım 2026 · Windows PowerShell 5.1 · Docker Compose

Komutlar proje kökünde (`yemekhane-baslangic`) çalıştırıldı. Çıktılar terminalden olduğu gibi alındı.
Her komutta çıkan `Using a password on the command line interface can be insecure.` uyarısı
README'de belirtildiği gibi önemsizdir.

## Özet

| # | Kontrol | Beklenen | Sonuç |
|---|---|---|---|
| 1 | Servis durumu | 4 servis `healthy`, `replica-setup` `Exited (0)` | ✅ |
| 2 | Replikasyon | `Replica_IO_Running: Yes`, `Replica_SQL_Running: Yes` | ✅ |
| 3–5 | Kaynakta yükleme, replikada görünür | 355,00 → 455,00 | ✅ |
| 6 | Replikaya yazma reddedilir | `ERROR 1290 ... --super-read-only` | ✅ |
| 7 | Replika kapalıyken yapılan değişikliği sonradan yakalar | 455,00 → 655,00 | ✅ |
| 8 | Redis | `PONG` | ✅ |

---

## 1. Tüm servislerin durumu

```
PS> docker compose ps -a
NAME                        IMAGE                COMMAND                  SERVICE         CREATED          STATUS                      PORTS
yemekhane-frontend-1        yemekhane-frontend   "httpd-foreground -D…"   frontend        19 minutes ago   Up 19 minutes (healthy)     0.0.0.0:8080->80/tcp, [::]:8080->80/tcp
yemekhane-mysql-primary-1   mysql:8.4            "docker-entrypoint.s…"   mysql-primary   19 minutes ago   Up 19 minutes (healthy)     0.0.0.0:3307->3306/tcp, [::]:3307->3306/tcp
yemekhane-mysql-replica-1   mysql:8.4            "docker-entrypoint.s…"   mysql-replica   19 minutes ago   Up 19 minutes (healthy)     0.0.0.0:3308->3306/tcp, [::]:3308->3306/tcp
yemekhane-redis-1           redis:7.4-alpine     "docker-entrypoint.s…"   redis           19 minutes ago   Up 19 minutes (healthy)     0.0.0.0:6379->6379/tcp, [::]:6379->6379/tcp
yemekhane-replica-setup-1   mysql:8.4            "bash /replica-setup…"   replica-setup   19 minutes ago   Exited (0) 18 minutes ago
```

`replica-setup` replikayı bir kez kurup çıkan yardımcı container'dır; `Exited (0)` başarıyla bittiğini gösterir.

## 2. Replikasyon durumu

```
PS> docker compose exec mysql-replica mysql -uroot -pyemekhane_kok -e "SHOW REPLICA STATUS\G"
*************************** 1. row ***************************
             Replica_IO_State: Waiting for source to send event
                  Source_Host: mysql-primary
                  Source_User: repl
                  Source_Port: 3306
                Connect_Retry: 60
              Source_Log_File: mysql-bin.000003
          Read_Source_Log_Pos: 736
               Relay_Log_File: relay-bin.000002
                Relay_Log_Pos: 422
        Relay_Source_Log_File: mysql-bin.000003
           Replica_IO_Running: Yes
          Replica_SQL_Running: Yes
              Replicate_Do_DB:
          Replicate_Ignore_DB:
           Replicate_Do_Table:
       Replicate_Ignore_Table:
      Replicate_Wild_Do_Table:
  Replicate_Wild_Ignore_Table:
                   Last_Errno: 0
                   Last_Error:
                 Skip_Counter: 0
          Exec_Source_Log_Pos: 736
              Relay_Log_Space: 627
              Until_Condition: None
               Until_Log_File:
                Until_Log_Pos: 0
           Source_SSL_Allowed: No
           Source_SSL_CA_File:
           Source_SSL_CA_Path:
              Source_SSL_Cert:
            Source_SSL_Cipher:
               Source_SSL_Key:
        Seconds_Behind_Source: 0
Source_SSL_Verify_Server_Cert: No
                Last_IO_Errno: 0
                Last_IO_Error:
               Last_SQL_Errno: 0
               Last_SQL_Error:
  Replicate_Ignore_Server_Ids:
             Source_Server_Id: 1
                  Source_UUID: 64fbefa7-db55-11f1-892e-4653db60fbda
             Source_Info_File: mysql.slave_master_info
                    SQL_Delay: 0
          SQL_Remaining_Delay: NULL
    Replica_SQL_Running_State: Replica has read all relay log; waiting for more updates
           Source_Retry_Count: 10
                  Source_Bind:
      Last_IO_Error_Timestamp:
     Last_SQL_Error_Timestamp:
               Source_SSL_Crl:
           Source_SSL_Crlpath:
           Retrieved_Gtid_Set:
            Executed_Gtid_Set: 64fbefa7-db55-11f1-892e-4653db60fbda:1-42
                Auto_Position: 1
         Replicate_Rewrite_DB:
                 Channel_Name:
           Source_TLS_Version:
       Source_public_key_path:
        Get_Source_public_key: 1
            Network_Namespace:
```

`Replica_IO_Running: Yes` (kaynaktan olayları alıyor) ve `Replica_SQL_Running: Yes` (aldıklarını uyguluyor),
`Seconds_Behind_Source: 0` (gecikme yok), `Auto_Position: 1` (GTID ile konumlanma).

## 3–5. Kaynakta yapılan bakiye yüklemesi replikada görünüyor

Önce replikadaki bakiye:

```
PS> docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
+----+--------+
| id | bakiye |
+----+--------+
|  7 | 355.00 |
+----+--------+
```

Kaynakta (mysql-primary) 100 TL yükleme:

```
PS> docker compose exec mysql-primary mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 100)"
+------------+--------+
| hareket_id | bakiye |
+------------+--------+
|        455 | 455.00 |
+------------+--------+
```

Replikada tekrar okuma:

```
PS> docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
+----+--------+
| id | bakiye |
+----+--------+
|  7 | 455.00 |
+----+--------+
```

## 6. Replikaya yazma denemesi read-only hatasıyla reddediliyor

```
PS> docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 50)"
ERROR 1290 (HY000) at line 1: The MySQL server is running with the --super-read-only option so it cannot execute this statement
```

Replika `super_read_only = ON` olduğu için yazma isteği reddedildi. Bu beklenen sonuçtur.

## 7. Replika durdurulup başlatıldığında aradaki değişikliği yakalıyor

```
PS> docker compose stop mysql-replica
 ✔ Container yemekhane-mysql-replica-1 Stopped

PS> docker compose exec mysql-primary mysql -uyemekhane_app -pUyg_2026 yemekhane -e "CALL sp_bakiye_yukle(7, 200)"
+------------+--------+
| hareket_id | bakiye |
+------------+--------+
|        456 | 655.00 |
+------------+--------+

PS> docker compose start mysql-replica
 ✔ Container yemekhane-mysql-replica-1 Started

PS> docker compose exec mysql-replica mysql -uyemekhane_app -pUyg_2026 yemekhane -e "SELECT id, bakiye FROM kullanicilar WHERE id = 7"
+----+--------+
| id | bakiye |
+----+--------+
|  7 | 655.00 |
+----+--------+
```

Replika kapalıyken kaynakta yapılan 200 TL yükleme, replika açıldığında GTID sayesinde kaldığı yerden alındı.

## 8. Redis

```
PS> docker compose exec redis redis-cli ping
PONG
```
