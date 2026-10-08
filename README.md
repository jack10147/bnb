# Winter Arc — личный дашборд ❄️

Статический сайт (Vite + React + Tailwind CSS + Recharts), тёмная тема, адаптив (ПК и телефон), интерфейс на русском.

## Команды
```bash
npm install
npm run dev          # разработка: http://localhost:5173
npm run build        # сборка в dist/ (статические файлы)
npm run preview      # локальный просмотр сборки: http://localhost:4173/bnb/
npm run screenshots  # проверка всех вкладок + скриншоты screenshots/real-*.png (нужен запущенный preview и /usr/bin/google-chrome)
npm run gen-sample   # пересоздать ПРИМЕРНЫЕ данные в scripts/sample/sample-data.json (реальные не трогает)
```

## Данные
Один файл `public/data/data.json`, формат описан в [DATA.md](DATA.md). Сайт читает его во время работы (fetch), так что
для обновления данных достаточно заменить JSON.

## Хостинг
По умолчанию сборка рассчитана на GitHub Pages репозитория `bnb` (бывший `winter-arc`): `base: '/bnb/'`
(сайт: `https://<user>.github.io/bnb/`), навигация через `#/вкладка`, данные грузятся относительным путём.
Деплой — `.github/workflows/deploy.yml` (Settings → Pages → Source: GitHub Actions), `public/.nojekyll` включён.
Другой хостинг: `VITE_BASE=/ npm run build` (корень домена) или `VITE_BASE=./ npm run build` (относительные пути).
