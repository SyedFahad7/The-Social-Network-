# Pre-deployment Checklist Script for Windows PowerShell
Write-Host "Social Network Project - Pre-deployment Checklist" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# Check if all required files exist
Write-Host "Checking required files..." -ForegroundColor Yellow
$files = @(
    "package.json",
    "Dockerfile.prod", 
    "backend/package.json",
    "backend/Dockerfile.prod",
    "docker-compose.render.yml",
    "render.yaml"
)

foreach ($file in $files) {
    if (Test-Path $file) {
        Write-Host "✅ $file exists" -ForegroundColor Green
    } else {
        Write-Host "❌ $file missing" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Environment Variables Checklist:" -ForegroundColor Yellow
Write-Host "-----------------------------------" -ForegroundColor Yellow
Write-Host "Have you set up MongoDB Atlas? (Y/n)" -ForegroundColor White
Write-Host "Have you set up Redis Cloud? (Y/n)" -ForegroundColor White
Write-Host "Have you configured Cloudinary? (Y/n)" -ForegroundColor White
Write-Host "Have you set up Firebase project? (Y/n)" -ForegroundColor White
Write-Host "Have you generated VAPID keys? (Y/n)" -ForegroundColor White
Write-Host "Do you have a Gmail app password for emails? (Y/n)" -ForegroundColor White

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Magenta
Write-Host "1. Push your code to GitHub" -ForegroundColor White
Write-Host "2. Go to render.com and create account" -ForegroundColor White
Write-Host "3. Create new Blueprint with your GitHub repo" -ForegroundColor White
Write-Host "4. Configure environment variables in Render dashboard" -ForegroundColor White
Write-Host "5. Deploy!" -ForegroundColor White

Write-Host ""
Write-Host "For detailed instructions, see: RENDER_DEPLOYMENT_GUIDE.md" -ForegroundColor Cyan

# Optional: Generate VAPID keys if needed
Write-Host ""
$generateKeys = Read-Host "Would you like to generate VAPID keys now? (Y/n)"
if ($generateKeys -eq "Y" -or $generateKeys -eq "y" -or $generateKeys -eq "") {
    Write-Host "Generating VAPID keys..." -ForegroundColor Yellow
    Set-Location backend
    node generate-vapid-keys.js
    Set-Location ..
}