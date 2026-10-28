#!/usr/bin/env bash
# SAMGO TEST - verification de demarrage sous emulation Android.
# reactivecircus/android-emulator-runner execute chaque ligne "script" separement;
# toutes les instructions de controle sont donc dans ce fichier execute par bash.
set -euo pipefail
adb wait-for-device
echo "Android started: $(adb shell getprop sys.boot_completed)"
echo "Waiting for Android package manager..."
for try in 1 2 3 4 5 6; do
  if adb shell pm list packages >/dev/null 2>&1; then break; fi
  sleep 8
done
echo "Installing SAMGO TEST without streaming..."
installed=0
for try in 1 2 3 4; do
  if adb install --no-streaming -r mobile/android/app/build/outputs/apk/debug/app-debug.apk; then
    installed=1
    break
  fi
  sleep 10
  adb wait-for-device
done
test "$installed" -eq 1
adb shell am start -W -n com.samgo.prototype/.MainActivity
sleep 12
adb shell pidof com.samgo.prototype
mkdir -p mobile/test-output
adb shell screencap -p /sdcard/samgo-test.png
adb pull /sdcard/samgo-test.png mobile/test-output/samgo-android-emulateur.png
test -s mobile/test-output/samgo-android-emulateur.png
echo "SAMGO Android TEST emulator: app started, screenshot saved."
