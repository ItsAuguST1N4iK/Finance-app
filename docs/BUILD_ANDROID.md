# Збірка та встановлення APK — Finance Control 10.2.7

## Готовий APK

`releases/FinanceControl-10.2.7.apk`

### Встановлення на Android

1. Скопіюйте APK на телефон (USB, Telegram, Drive…).
2. Відкрийте файл → дозвольте встановлення з цього джерела.
3. Встановіть **Finance Control**.
4. За бажанням увімкніть біометрію: **Налаштування → Перевага користувача**.

---

## EAS Build (хмара Expo)

Без Android Studio на ПК:

```bash
npm install
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

У кабінеті Expo з’явиться посилання на `.apk`. Збережіть його як `releases/FinanceControl-10.2.7.apk`.

Профіль `preview` у `eas.json` збирає **APK** для прямої установки.

---

## Локальна збірка (Gradle)

Потрібні:

- Android SDK (`ANDROID_HOME` / `LOCALAPPDATA\Android\Sdk`)
- **JDK 17** (не 25 — Gradle для RN часто падає на новіших JDK)

```bash
# Windows PowerShell
$env:JAVA_HOME = "C:\Program Files\Microsoft\jdk-17.*"   # підставте точний шлях
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:ANDROID_HOME\platform-tools;$env:PATH"

npx expo prebuild -p android --clean
cd android
.\gradlew.bat assembleRelease
copy app\build\outputs\apk\release\app-release.apk ..\releases\FinanceControl-10.2.7.apk
```

Якщо `assembleRelease` вимагає підпис — для внутрішньої роздачі можна використати `assembleDebug` або налаштувати keystore у `android/app`.

---

## Підпис

- Preview / debug APK — debug або EAS-ключ (підходить для sideload).
- Google Play — окремий upload keystore і зазвичай **AAB** (профіль `production` можна змінити на `app-bundle`).
