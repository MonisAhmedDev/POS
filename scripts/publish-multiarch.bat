@echo off
setlocal EnableExtensions EnableDelayedExpansion

rem Defaults
if "%FASTBITE_IMAGE_NAME%"=="" set "FASTBITE_IMAGE_NAME=ferozkhandev/fastbite-app"
if "%FASTBITE_IMAGE_TAG%"=="" set "FASTBITE_IMAGE_TAG=latest"
if "%FASTBITE_PLATFORMS%"=="" set "FASTBITE_PLATFORMS=linux/amd64,linux/arm64"
if "%FASTBITE_EXTRA_TAGS%"=="" set "FASTBITE_EXTRA_TAGS="

rem Check docker exists
where docker >nul 2>nul
if errorlevel 1 (
    echo Error: docker command not found. 1>&2
    exit /b 1
)

rem Check buildx exists
docker buildx version >nul 2>nul
if errorlevel 1 (
    echo Error: Docker Buildx is required. 1>&2
    exit /b 1
)

rem Base command
set "CMD=docker buildx build --platform "%FASTBITE_PLATFORMS%" -t "%FASTBITE_IMAGE_NAME%:%FASTBITE_IMAGE_TAG%""

rem Add extra tags if present
if not "%FASTBITE_EXTRA_TAGS%"=="" (
    set "TAGS=%FASTBITE_EXTRA_TAGS%"
    :loop_tags
    for /f "tokens=1* delims=," %%A in ("!TAGS!") do (
        set "EXTRA_TAG=%%A"
        set "TAGS=%%B"
    )

    if not "!EXTRA_TAG!"=="" (
        set "CMD=!CMD! -t "%FASTBITE_IMAGE_NAME%:!EXTRA_TAG!""
    )

    if defined TAGS goto loop_tags
)

rem Finalize command
set "CMD=!CMD! --push ."

echo Publishing %FASTBITE_IMAGE_NAME%:%FASTBITE_IMAGE_TAG% for %FASTBITE_PLATFORMS%
call !CMD!
exit /b %ERRORLEVEL%