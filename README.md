# Мои отчеты — v21

## Новое в v21

- Добавлено восстановление пароля через email.
- Добавлена страница «Забыли пароль?».
- Добавлена страница сброса пароля по одноразовой ссылке.
- Добавлены SMTP-настройки через .env.
- Добавлена модель PasswordResetToken.

# Мои отчеты — v20

Внутренняя веб-система учета работ, проверки операций и выплат работникам.

## Новое в v20

- v19 включена в v20.
- Исправлена отмена выплат: работы возвращаются в статус «Принято».
- Добавлено удаление не оплаченных выплат из журнала.
- Суммы заказчику убраны из интерфейса работодателя, печати и CSV.
- PDF/печать отчётов содержит выбранные фильтры.
- Чистый seed: работодатель `Токарь / ALGEBRA3217`.
- Добавлен `ecosystem.config.cjs` для PM2 cluster на 20 пользователей.
- Добавлен почасовой backup PostgreSQL с поддержкой удаленного облака через rclone.
- Добавлен скрипт восстановления пароля администратора.
- Обновлены рекомендации по безопасности.

## Установка на VPS

```bash
cd /root/moi_otchety_web
git fetch origin
git reset --hard origin/main
git clean -fd

npm install
npx prisma db push
npx prisma generate
npm run build
pm2 delete moi-otchety || true
pm2 start ecosystem.config.cjs
pm2 save
```

## Чистый запуск

Перед очисткой обязательно сделайте backup.

```bash
cd /root/moi_otchety_web
/root/moi_otchety_web/scripts/backup-hourly.sh
npx prisma db push --force-reset
npm run seed
npm run build
pm2 restart moi-otchety --update-env
```

Вход работодателя:

```text
Токарь
ALGEBRA3217
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

## Восстановление пароля администратора

```bash
cd /root/moi_otchety_web
node scripts/reset-admin-password.cjs Токарь НОВЫЙ_ПАРОЛЬ
pm2 restart moi-otchety --update-env
```
