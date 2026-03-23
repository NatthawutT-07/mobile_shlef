@echo off
echo ==========================================
echo   Mobile-BMR: Building Production APK
echo ==========================================
echo.
echo This script will build an APK file for Android devices.
echo You may need to log in to your Expo account.
echo.

call npx eas-cli build -p android --profile production-apk

echo.
echo If the build was successful, download the .apk file from the link above.
echo You can then install it on any Android device.
echo.
pause
