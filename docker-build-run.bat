@echo off
SETLOCAL ENABLEDELAYEDEXPANSION

REM === Load variables from .env ===
FOR /F "tokens=1,2 delims== usebackq" %%A IN (".env") DO (
    SET "VAR=%%A"
    SET "VAL=%%B"
    SET "VAL=!VAL:"=!"
    SET "VAL=!VAL:~0,255!"
    SET "!VAR!=!VAL!"
)

REM === Remove old container if it exists ===
docker rm -f eclipse-bot >nul 2>&1

echo 🔨 Building Eclipse-Bot Docker image...
docker build --no-cache -t eclipse-bot:latest .

echo 🚀 Starting Eclipse-Bot container with Docker socket access...
docker run -d --name eclipse-bot ^
-v /var/run/docker.sock:/var/run/docker.sock ^
--group-add 998 ^
--group-add 999 ^
-e DISCORD_TOKEN=%DISCORD_TOKEN% ^
-e SUPER_USER_ID=%SUPER_USER_ID% ^
-e DISCORD_CLIENT_ID=%DISCORD_CLIENT_ID% ^
-e LOG_LEVEL=%LOG_LEVEL% ^
-e DEBUG=%DEBUG% ^
-e TEST_MODE=%TEST_MODE% ^
-e MONGO_URI=%MONGO_URI% ^
-e MONGO_DB_NAME=%MONGO_DB_NAME% ^
eclipse-bot:latest

echo ✅ Eclipse-Bot container is running with Docker socket access!
echo ⚠️  If you still get EACCES, check the docker.sock group ownership:
echo    > sudo ls -l /var/run/docker.sock
echo    > sudo chmod 666 /var/run/docker.sock
ENDLOCAL
pause
