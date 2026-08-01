# ARCHITECTURE — Finance Control v10.2.6

## Принцип: усе на пристрої

Застосунок працює **без власного сервера і хмарної БД**. Дані — у SQLite на телефоні. API-токени — у `expo-secure-store`. UI звертається до зовнішніх API (Monobank, IBKR, FX) лише за дією користувача.

---

## Tech stack

| Шар | Технологія |
|---|---|
| Mobile | React Native 0.81 + **Expo SDK 54** |
| Navigation | `@react-navigation/bottom-tabs` + custom `IslandTabBar` |
| State | Zustand |
| DB | `expo-sqlite` |
| Secure storage | `expo-secure-store` |
| Biometrics | `expo-local-authentication` |
| Motion | `react-native-reanimated` 4 |
| Charts | `react-native-svg` |
| CSV / XLS | `papaparse`, `xlsx` |

---

## Екрани

```
Dashboard → рахунки, курси, останні tx, планер-алерти
Transactions → пошук, фільтри, деталі, категорії
Planner → планові доходи/витрати
Analytics → KPI, графік, платформи, IBKR, категорії
Settings → вигляд, переваги, платформи, картки/правила, danger
```

Навігація: floating island tab bar з **rolling accent circle** + bounce іконки активного табу. Опційно можна вимкнути підписи табів.

---

## Дані

- Міграції: `src/db/migrations.ts`
- Репозиторії: `src/db/repos/*`
- Слайси Zustand: `src/store/*`
- Імпорт/синк: `src/api/*`, `src/services/importJobQueue.ts`, `src/services/refreshAppData.ts`

Див. також [`DATA_MODEL.md`](DATA_MODEL.md).

---

## UI / motion

| Концепт | Реалізація |
|---|---|
| Токени | `src/theme/tokens.ts` — `radius`, `stroke` (1.25), `space`, `layout` |
| Теми | 4 ключі (`dark` / `cursor` / `oled` / `light`) + акцент |
| Попапи | `BottomSheetModal` + `useOverlayPresence` (макс. ~75% екрана) |
| Empty | `EmptyState` |
| Іконки дій | `WiggleActionIcon`, `ChevronToggle`, `SpinAddButton` |

---

## Безпека

- API-токени лише в Secure Store
- Опційний біометричний замок (`BiometricGate`) при старті / поверненні з фону
- Експорт/скидання — лише з «Небезпечної зони»

---

## Збірка

Див. кореневий [`README.md`](../README.md) — EAS `preview` профіль збирає APK.
