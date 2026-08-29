$ErrorActionPreference = 'Stop'
$sdkDir = "C:\Android\Sdk"
$toolsDir = "$sdkDir\cmdline-tools"
$javaHome = "C:\Program Files\Microsoft\jdk-17.0.20.101-hotspot"

# Set environment variables for current session and user
[System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, [System.EnvironmentVariableTarget]::Process)
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkDir, [System.EnvironmentVariableTarget]::Process)
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkDir, [System.EnvironmentVariableTarget]::Process)

[System.Environment]::SetEnvironmentVariable("JAVA_HOME", $javaHome, [System.EnvironmentVariableTarget]::User)
[System.Environment]::SetEnvironmentVariable("ANDROID_HOME", $sdkDir, [System.EnvironmentVariableTarget]::User)
[System.Environment]::SetEnvironmentVariable("ANDROID_SDK_ROOT", $sdkDir, [System.EnvironmentVariableTarget]::User)

$env:PATH = "$javaHome\bin;$sdkDir\cmdline-tools\latest\bin;$sdkDir\platform-tools;$env:PATH"

New-Item -ItemType Directory -Force -Path "$toolsDir" | Out-Null

$zipUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"
$zipFile = "$env:TEMP\cmdline-tools.zip"

if (-not (Test-Path "$toolsDir\latest\bin\sdkmanager.bat")) {
    Write-Host "Downloading Android Command Line Tools via curl..."
    curl.exe -L -o $zipFile $zipUrl
    Write-Host "Extracting..."
    Expand-Archive -Path $zipFile -DestinationPath "$toolsDir" -Force
    if (Test-Path "$toolsDir\latest") {
        Remove-Item -Recurse -Force "$toolsDir\latest"
    }
    Rename-Item -Path "$toolsDir\cmdline-tools" -NewName "latest"
    Remove-Item $zipFile -Force
}

Write-Host "Configuring Flutter Android SDK path..."
& C:\flutter\bin\flutter.bat config --android-sdk $sdkDir

Write-Host "Accepting licenses and installing SDK packages..."
$sdkManager = "$toolsDir\latest\bin\sdkmanager.bat"

# Accept licenses
cmd /c "echo y | `"$sdkManager`" --licenses"

# Install platforms, build-tools, and cmake
cmd /c "`"$sdkManager`" `"platforms;android-34`" `"build-tools;34.0.0`" `"platform-tools`" `"cmake;3.22.1`""

# Accept flutter licenses
cmd /c "echo y | C:\flutter\bin\flutter.bat doctor --android-licenses"

Write-Host "Android SDK Setup Complete!"
