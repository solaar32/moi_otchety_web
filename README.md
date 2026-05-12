# Мои отчеты — веб-версия

Стартовый каркас сайта вместо мобильного приложения.

## Что уже есть

- Вход работника по логину/паролю.
- Вход работодателя.
- Демо-кабинет работника.
- Демо-кабинет работодателя.
- Страница отчетов с фильтрами.
- Страница работников.
- Страница загрузки Excel-прайса.
- API `/api/import-price`, который читает Excel и возвращает разделы по листам.
- SQL-схема Supabase в `supabase/schema.sql`.

## Демо-вход

Работодатель:

```text
admin / admin123
```

Работник:

```text
Иванов / 123456
```

## Запуск локально

```bash
npm install
npm run dev
```

Открыть:

```text
http://localhost:3000
```

## Следующие шаги

1. Создать проект Supabase.
2. Выполнить SQL из `supabase/schema.sql`.
3. Подключить `.env.local`.
4. Заменить демо-авторизацию на работу с таблицей `app_users`.
5. Добавить сохранение отчетов в PostgreSQL.

## v9

- Admin can manage workers from database: add, edit login, edit full name, set new password, enable/disable worker.
- Price upload now stores version metadata: file name, upload date, sections count, items count, uploader.
- Admin price page shows current price version and upload date.

## v15

Добавлено:
- экспорт отчетов в CSV и печатный HTML для сохранения в PDF;
- экспорт ведомости выплат в CSV и печатный HTML/PDF;
- удобства работника: поиск операций, избранные операции, последние операции, запоминание последнего номера заказа, быстрые итоги по статусам;
- резервное копирование данных в JSON через админский раздел Backup;
- версия сайта обновлена до v15 от 12.05.2026.
