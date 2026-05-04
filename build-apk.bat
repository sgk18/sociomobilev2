@echo off
echo [1/4] Building Next.js application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo Next.js build failed.
    exit /b %ERRORLEVEL%
)

echo [2/4] Syncing with Capacitor...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo Capacitor sync failed.
    exit /b %ERRORLEVEL%
)

echo [3/4] Building Android APK (Debug)...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 (
    echo Gradle build failed.
    exit /b %ERRORLEVEL%
)

echo [4/4] Copying APK to root directory...
copy app\build\outputs\apk\debug\app-debug.apk ..\socio-app-debug.apk
cd ..

echo.
echo ===================================================
echo Success! Your APK is ready: socio-app-debug.apk
echo ===================================================
pause