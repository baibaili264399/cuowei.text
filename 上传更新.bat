@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ==========================================
echo   错位夜宵 2.0  --^>  GitHub
echo ==========================================
echo.
git add -A
git -c core.quotepath=false commit -m "更新 %date% %time%"
git push
echo.
echo 看到 "main -> main" 或 "Everything up-to-date" 就是成功。
echo 约 1 分钟后刷新： https://baibaili264399.github.io/cuowei.text/
echo.
pause