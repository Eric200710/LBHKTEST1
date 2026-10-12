<#
.SYNOPSIS
    一鍵啟動 Ollama (Qwen2) 與 Ngrok 隧道，並自動配置安全跨域環境。
.DESCRIPTION
    1. 檢查並自動下載/安裝 Ollama (若尚未安裝)
    2. 設定 OLLAMA_ORIGINS="*" 與 OLLAMA_HOST="0.0.0.0:11434" (解決 403 存取問題)
    3. 啟動 Ollama 服務並下載 qwen2 (若尚未下載)
    4. 檢查 ngrok 並提供登入引導，隨後啟動公開網域
.NOTES
    請以 一般 PowerShell 或 系統管理員身分 執行此腳本。
#>

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  LINE Bot 本地 Ollama (Qwen2) + Ngrok 一鍵部署工具" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# -----------------------------------------------------------
# 步驟 1：設定環境變數 (解決 Ollama 403 禁止外部連線問題)
# -----------------------------------------------------------
Write-Host "[1/4] 設定環境變數 (允許外部來源存取，防 403 錯誤)..." -ForegroundColor Yellow
$env:OLLAMA_ORIGINS = "*"
$env:OLLAMA_HOST = "0.0.0.0:11434"
[System.Environment]::SetEnvironmentVariable("OLLAMA_ORIGINS", "*", "User")
[System.Environment]::SetEnvironmentVariable("OLLAMA_HOST", "0.0.0.0:11434", "User")
Write-Host "  -> OLLAMA_ORIGINS=* 與 OLLAMA_HOST=0.0.0.0:11434 已生效！" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------
# 步驟 2：檢查並安裝 Ollama
# -----------------------------------------------------------
Write-Host "[2/4] 檢查 Ollama 安裝狀態..." -ForegroundColor Yellow
$ollamaCmd = Get-Command "ollama" -ErrorAction SilentlyContinue

if (-not $ollamaCmd) {
    Write-Host "  -> 尚未檢測到 Ollama，準備開始下載安裝..." -ForegroundColor Magenta
    $installerPath = "$env:TEMP\OllamaSetup.exe"
    Write-Host "  -> 下載 Ollama 安裝程式至 $installerPath ..." -ForegroundColor Gray
    Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile $installerPath
    Write-Host "  -> 正在執行安裝程式，請稍候..." -ForegroundColor Gray
    Start-Process -FilePath $installerPath -Wait
    
    # 重新整理 PATH
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
} else {
    Write-Host "  -> Ollama 已安裝於: $($ollamaCmd.Source)" -ForegroundColor Green
}

# 確保停用舊的 Ollama 背景服務以讀取新環境變數
Get-Process -Name "ollama*" -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 1

# 啟動 Ollama 服務背景行程
Write-Host "  -> 啟動 Ollama 核心伺服器..." -ForegroundColor Cyan
Start-Process "ollama" -ArgumentList "serve" -WindowStyle Hidden
Start-Sleep -Seconds 3

# 下載並預載 qwen2 模型
Write-Host "  -> 檢查 / 下載 qwen2 模型 (這可能需要數分鐘，請稍候)..." -ForegroundColor Yellow
ollama pull qwen2
Write-Host "  -> qwen2 模型準備完成！" -ForegroundColor Green
Write-Host ""

# -----------------------------------------------------------
# 步驟 3：檢查與設定 Ngrok
# -----------------------------------------------------------
Write-Host "[3/4] 檢查 Ngrok..." -ForegroundColor Yellow
$ngrokCmd = Get-Command "ngrok" -ErrorAction SilentlyContinue

if (-not $ngrokCmd) {
    Write-Host "  -> 尚未檢測到 Ngrok 命令列工具。" -ForegroundColor Magenta
    Write-Host "  -> 建議前往 https://ngrok.com/download 下載 ngrok.exe 並放入 PATH。" -ForegroundColor Red
    $installNgrok = Read-Host "是否嘗試使用 winget 自動安裝 ngrok? (Y/n)"
    if ($installNgrok -ne "n" -and $installNgrok -ne "N") {
        winget install Ngrok.Ngrok
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
    }
}

# 提示登入 Token (如果尚未配置)
$ngrokConfigCheck = ngrok config check 2>&1
if ($LASTEXITCODE -ne 0 -or $ngrokConfigCheck -match "ERR_NGROK") {
    Write-Host ""
    Write-Host ">>> 提示：若您尚未登入 ngrok，請前往 https://dashboard.ngrok.com 複製您的 Authtoken" -ForegroundColor Cyan
    $token = Read-Host "請輸入您的 ngrok authtoken (若已登入可直接按 Enter 略過)"
    if ($token.Trim() -ne "") {
        ngrok config add-authtoken $token.Trim()
        Write-Host "  -> Ngrok Authtoken 設定完成！" -ForegroundColor Green
    }
}

# -----------------------------------------------------------
# 步驟 4：啟動 Ngrok 穿透
# -----------------------------------------------------------
Write-Host ""
Write-Host "[4/4] 正在啟動 ngrok 轉發 http://localhost:11434 ..." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "【重要提示】" -ForegroundColor Yellow
Write-Host "1. ngrok 啟動後，請複製其顯示的 Forwarding HTTPS 網址" -ForegroundColor White
Write-Host "   例如: https://xxxx.ngrok-free.dev" -ForegroundColor White
Write-Host "2. 將該網址貼入 Google Apps Script 中的 OLLAMA_URL" -ForegroundColor White
Write-Host "   例如: https://xxxx.ngrok-free.dev/api/generate" -ForegroundColor White
Write-Host "3. 保持此終端視窗開啟即可持續提供 LINE Bot 呼叫！" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

ngrok http 11434
