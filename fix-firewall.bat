# ============================================================
# Fix: Allow port 5000 through Windows Firewall for LAN access
# ============================================================
# Run this script as Administrator in PowerShell:
# Right-click PowerShell -> "Run as Administrator" -> paste lines below

netsh advfirewall firewall add rule name="ExpenseTracker-Node-5000" dir=in action=allow protocol=tcp localport=5000 profile=any

echo "Done. Port 5000 is now open for inbound TCP from all network profiles."

