@echo off
echo 🚀 Publishing Changes to Watercolor Workshop...
echo.

echo 📋 Adding all changes to Git...
git add .

echo.
echo 💬 Please enter your commit message:
set /p commit_message="Commit message: "

echo.
echo 📝 Committing changes...
git commit -m "%commit_message%"

echo.
echo 🌐 Pushing to GitHub...
git push origin main

echo.
echo ✅ Changes pushed successfully!
echo 🌍 Your site will be automatically deployed to: https://watercolor-workshop.vercel.app
echo.
pause
