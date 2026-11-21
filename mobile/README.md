# Quiree Android app (home-screen QR widget)

A thin Android app around the live site (`https://quiree.runasp.net`) whose main job is a **native
home-screen QR widget** — something websites can't create. Every screen inside the app is the normal
website, so web deploys update the app automatically; only native changes (the widget) need a new app build.

## How it works

| Part | Where |
|---|---|
| App shell (Capacitor 8) loading the live site | `capacitor.config.json` (`server.url`) |
| Widget (draws the QR on the device — works offline) | `android/app/src/main/java/com/quiree/app/QrWidgetProvider.java`, `res/layout/widget_qr.xml` |
| Bridge the website calls (`setQr`, `getQr`, `requestPin`, `clear`) | `QrWidgetPlugin.java` → used by `frontend/src/lib/nativeWidget.ts` |
| "Add QR widget to home screen" card (only shown inside the app) | `frontend/src/components/qr/HomeWidgetCard.tsx` on the personal and business QR pages |

Flow: user opens a QR page in the app → taps **Add QR widget to home screen** → Android shows its
"Add to home screen" sheet → the widget appears showing that QR. Tapping the widget opens the app on that
QR's page. Choosing another QR later updates the widget in place. Signing out clears it.

> The "Add QR widget" card appears only after the updated **frontend** is deployed to quiree.runasp.net.

## Build (Windows)

Requirements: Node 20+, Android Studio (its bundled JDK 21 and Android SDK 36).

```powershell
cd mobile
npm install
npx cap sync android          # after changing capacitor.config.json
cd android
$env:JAVA_HOME = "C:\Program Files\Android\Android Studio\jbr"
.\gradlew assembleDebug        # → app\build\outputs\apk\debug\app-debug.apk
```

Install on a phone with USB debugging: `adb install -r app\build\outputs\apk\debug\app-debug.apk`,
or open `mobile/android` in Android Studio and press Run.

## Publish to Google Play

1. **Choose the final app id before the first upload** — `com.quiree.app` in `capacitor.config.json` and
   `android/app/build.gradle`. It can't change after publishing.
2. Create an upload key (keep it safe; never commit it):
   `keytool -genkey -v -keystore quiree-upload.jks -keyalg RSA -keysize 2048 -validity 10000 -alias quiree`
3. In Android Studio: **Build → Generate Signed App Bundle** → choose the key → `release` → upload the `.aab`
   in the Play Console (Google Play developer account, one-time fee).
4. Bump `versionCode` / `versionName` in `android/app/build.gradle` for every new upload.
5. Replace the default Capacitor launcher icon and splash (`android/app/src/main/res/mipmap-*`, `drawable*/splash.png`)
   with Quiree artwork before release.

## iPhone

iOS widgets need a native WidgetKit extension, a Mac with Xcode and an Apple Developer account. Not built yet;
the web bridge (`nativeWidget.ts`) is ready to reuse once an iOS widget exists.
