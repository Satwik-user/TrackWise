@echo off
REM TrackWise Railway Optimization System - Windows Startup Script

echo 🚂 TrackWise Railway Optimization System
echo ========================================

REM Check if Python is installed
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Python is not installed or not in PATH
    pause
    exit /b 1
)

echo ✅ Python found: 
python --version

REM Check if we're in a virtual environment
if defined VIRTUAL_ENV (
    echo ✅ Virtual environment active: %VIRTUAL_ENV%
) else (
    echo ⚠️ No virtual environment detected
    set /p continue="Continue without virtual environment? (y/N): "
    if /i not "%continue%"=="y" (
        echo ℹ️ Create a virtual environment with:
        echo   python -m venv venv
        echo   venv\Scripts\activate
        pause
        exit /b 1
    )
)

REM Install requirements
if exist "requirements.txt" (
    echo ℹ️ Installing/updating requirements...
    pip install -r requirements.txt
    echo ✅ Requirements installed
) else (
    echo ⚠️ requirements.txt not found
)

REM Check .env file
if not exist ".env" (
    if exist ".env.example" (
        echo ℹ️ Creating .env from .env.example...
        copy ".env.example" ".env"
        echo ⚠️ Please update .env with your actual configuration!
    ) else (
        echo ❌ .env file not found and no .env.example available
        pause
        exit /b 1
    )
)

echo.
echo 🗄️ Database Setup Options:
echo 1. Use Docker Compose (recommended for development)
echo 2. Use existing PostgreSQL installation
echo 3. Skip database setup
set /p db_option="Choose option (1-3): "

if "%db_option%"=="1" (
    where docker-compose >nul 2>&1
    if errorlevel 1 (
        where docker >nul 2>&1
        if errorlevel 1 (
            echo ❌ Docker or Docker Compose not found
            pause
            exit /b 1
        )
        echo ℹ️ Starting database services with Docker Compose...
        docker compose up -d postgres redis
    ) else (
        echo ℹ️ Starting database services with Docker Compose...
        docker-compose up -d postgres redis
    )
    echo ✅ Database services started
    timeout /t 5 /nobreak >nul
) else if "%db_option%"=="2" (
    echo ℹ️ Using existing PostgreSQL installation
    echo ⚠️ Make sure your database is running and .env is configured correctly
) else if "%db_option%"=="3" (
    echo ⚠️ Skipping database setup - application may not work properly
) else (
    echo ❌ Invalid option
    pause
    exit /b 1
)

echo.
echo 🚀 Startup Options:
echo 1. Full startup (recommended)
echo 2. Quick start (development)
echo 3. Custom uvicorn command
set /p startup_option="Choose startup method (1-3): "

if "%startup_option%"=="1" (
    echo ℹ️ Starting TrackWise with full initialization...
    python start_app.py
) else if "%startup_option%"=="2" (
    echo ℹ️ Starting TrackWise in quick development mode...
    python quick_start.py
) else if "%startup_option%"=="3" (
    echo ℹ️ Starting with custom uvicorn command...
    uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
) else (
    echo ❌ Invalid option
    pause
    exit /b 1
)

pause