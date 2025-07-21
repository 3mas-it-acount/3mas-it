@echo off
REM Backup MySQL database for IT Support project
set DB_NAME=it_support
set DB_USER=it_user
set DB_PASS=3masadmin
set BACKUP_DIR=backup

REM      
for /f "tokens=2 delims==" %%I in ('"wmic os get localdatetime /value"') do set datetime=%%I
set DATE=%datetime:~0,4%-%datetime:~4,2%-%datetime:~6,2%_%datetime:~8,2%-%datetime:~10,2%

if not exist %BACKUP_DIR% mkdir %BACKUP_DIR%
mysqldump -u %DB_USER% -p%DB_PASS% %DB_NAME% > %BACKUP_DIR%\%DB_NAME%_%DATE%.sql
if %ERRORLEVEL%==0 (
  echo Backup completed successfully: %BACKUP_DIR%\%DB_NAME%_%DATE%.sql
) else (
  echo Backup failed!
)
pause 