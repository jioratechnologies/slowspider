$ErrorActionPreference = 'Stop'
$javaHome = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"
$sdkDir = "C:\Android\Sdk"

$env:JAVA_HOME = $javaHome
$env:ANDROID_HOME = $sdkDir
$env:ANDROID_SDK_ROOT = $sdkDir
$env:PATH = "$javaHome\bin;$sdkDir\platform-tools;$sdkDir\cmdline-tools\latest\bin;$env:PATH"

Write-Host "Accepting all Android licenses..."
$answers = ("y`n" * 15)
$answers | & C:\flutter\bin\flutter.bat doctor --android-licenses

Write-Host "Ensuring CMake 3.22.1 is installed..."
$sdkManager = "$sdkDir\cmdline-tools\latest\bin\sdkmanager.bat"
cmd /c "`"$sdkManager`" `"cmake;3.22.1`""

Write-Host "Starting Release APK Build..."
Set-Location "d:\jioratech\slowspider\apps\android"
& C:\flutter\bin\flutter.bat build apk --release

Write-Host "Build Finished!"
