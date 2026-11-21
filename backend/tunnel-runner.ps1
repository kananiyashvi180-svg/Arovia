while ($true) {
    Write-Host "Starting localtunnel on port 5000..."
    npx localtunnel --port 5000
    Start-Sleep -Seconds 2
}
