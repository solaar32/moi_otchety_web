# Рекомендации по защите сайта «Мои отчеты»

## Обязательно

1. Использовать только HTTPS-домен, не входить через `http://IP`.
2. Вернуть secure-cookie для production:
   - `secure: process.env.NODE_ENV === 'production'` или `secure: true` при работе только через HTTPS.
3. Сменить пароли `admin/admin123` и тестовых работников.
4. Использовать длинные пароли для администраторов.
5. Не хранить `.env` в GitHub.
6. Ограничить SSH-доступ:
   - вход по ключу;
   - отключить парольный вход;
   - отключить root login после создания sudo-пользователя.
7. Включить firewall:
   - 22/tcp только для SSH;
   - 80/tcp и 443/tcp для сайта.
8. Установить fail2ban.
9. Делать резервные копии каждый час и хранить копии вне VPS.
10. Регулярно обновлять Ubuntu.

## Команды для базовой защиты VPS

```bash
apt update && apt upgrade -y
apt install ufw fail2ban -y
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
systemctl enable fail2ban
systemctl start fail2ban
```

## SSH

Рекомендуется создать отдельного пользователя и запретить root/password login:

```bash
adduser deploy
usermod -aG sudo deploy
mkdir -p /home/deploy/.ssh
cp /root/.ssh/authorized_keys /home/deploy/.ssh/authorized_keys
chown -R deploy:deploy /home/deploy/.ssh
chmod 700 /home/deploy/.ssh
chmod 600 /home/deploy/.ssh/authorized_keys
```

Потом в `/etc/ssh/sshd_config`:

```text
PermitRootLogin no
PasswordAuthentication no
```

И перезапустить SSH:

```bash
systemctl restart ssh
```

## Backup в облако

В v17 есть скрипт:

```bash
/root/moi_otchety_web/scripts/backup-hourly.sh
```

Пример cron:

```bash
crontab -e
0 * * * * /root/moi_otchety_web/scripts/backup-hourly.sh >> /var/log/moi-otchety-backup.log 2>&1
```

Для удаленного хранения настройте `rclone`:

```bash
apt install rclone -y
rclone config
```

Затем добавьте в `/root/.profile` или в cron переменную:

```bash
RCLONE_REMOTE="moi-cloud:moi-otchety-backups"
```

## Что добавить позже

- ограничение попыток входа;
- 2FA для администраторов;
- журнал входов;
- уведомления о входе администратора;
- автоматическая проверка backup-восстановления.

## v18: защита входа и мониторинг

### Что добавлено в приложении

- Ограничение попыток входа: не более 5 ошибочных попыток за 15 минут по логину/IP.
- Журнал входов: успешные и неуспешные попытки, IP, user-agent, причина отказа.
- Админская страница `/admin/security` для просмотра журнала входов.
- Secure cookie для HTTPS-домена.

### Рекомендации для VPS

1. Отключить вход root по паролю и перейти на SSH-ключи.
2. Установить fail2ban:

```bash
apt install fail2ban -y
systemctl enable --now fail2ban
```

3. Закрыть лишние порты через UFW:

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

4. Обновлять систему:

```bash
apt update && apt upgrade -y
```

5. Использовать длинные пароли для админов и работников.
6. Удалять или отключать бывших сотрудников.
7. Проверять журнал `/admin/security` после подозрительной активности.
8. Хранить backup не только на VPS, но и на внешнем сервере/облаке.

### Для будущей версии

- Подключить Telegram/Email-уведомления о подозрительных входах.
- Добавить 2FA для администраторов.
- Добавить IP allowlist для админки при необходимости.
