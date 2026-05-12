# Защита сайта «Мои отчеты»

## Обязательно включить на VPS

```bash
apt update && apt upgrade -y
apt install ufw fail2ban rclone -y
ufw allow OpenSSH
ufw allow 80
ufw allow 443
ufw enable
```

## PM2 cluster для 20 пользователей

```bash
cd /root/moi_otchety_web
pm2 delete moi-otchety
pm2 start ecosystem.config.cjs
pm2 save
```

## Почасовой backup

```bash
chmod +x /root/moi_otchety_web/scripts/backup-hourly.sh
crontab -e
```

Добавить:

```cron
0 * * * * /root/moi_otchety_web/scripts/backup-hourly.sh >> /var/log/moi-otchety-backup.log 2>&1
```

## Удаленное облако

Рекомендуется `rclone`: Yandex Object Storage, Backblaze B2, S3-совместимое хранилище.

После `rclone config` добавьте в `/root/.profile` или crontab:

```bash
RCLONE_REMOTE="yandex:backups/moi-otchety"
```

## Восстановление пароля администратора

Если потерян пароль:

```bash
cd /root/moi_otchety_web
node scripts/reset-admin-password.cjs Токарь НОВЫЙ_ПАРОЛЬ
pm2 restart moi-otchety --update-env
```

## Рекомендации

- Использовать только HTTPS: `https://vek32work.ru`.
- Пароли не короче 10 символов.
- Для администраторов использовать отдельные логины.
- Не хранить пароль от VPS в переписках.
- Не открывать порт PostgreSQL наружу.
- Раз в месяц проверять backup восстановлением на тестовой базе.
- Не запускать `prisma db push --force-reset` на рабочей базе без актуального backup.
