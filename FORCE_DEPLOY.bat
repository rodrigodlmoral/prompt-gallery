@echo off
cd /d "C:\Users\dquiroz\Documents\GitHub\prompt-gallery"
echo === SETTING REMOTE ===
git remote set-url origin https://github.com/rodrigodlmoral/prompt-gallery.git
echo === FORCE PUSHING ===
git push origin main --force
