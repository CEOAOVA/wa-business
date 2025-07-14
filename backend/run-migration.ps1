#!/usr/bin/env pwsh

Write-Host "Running database migration..." -ForegroundColor Green
Set-Location $PSScriptRoot

Write-Host "Step 1: Generating Prisma client..." -ForegroundColor Yellow
npx prisma generate

Write-Host "Step 2: Creating migration..." -ForegroundColor Yellow
npx prisma migrate dev --name add-contact-management

Write-Host "Step 3: Checking migration status..." -ForegroundColor Yellow
npx prisma migrate status

Write-Host "Migration completed successfully!" -ForegroundColor Green
Write-Host "Press any key to exit..."
Read-Host 