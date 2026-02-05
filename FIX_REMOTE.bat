@echo off
cd /d "C:\Users\dquiroz\Documents\GitHub\prompt-gallery"
echo === FIXING REMOTE TO rodrigodlmoral ===
git remote set-url origin https://github.com/rodrigodlmoral/prompt-gallery.git
echo === VERIFYING ===
git remote -v
echo === RETRYING PUSH ===
git push origin main
