#!/bin/bash
cd "$(dirname "$0")"

PORT=5173
IP=$(ipconfig getifaddr en0 2>/dev/null || echo "localhost")
URL="http://${IP}:${PORT}/"

echo ""
echo "🎮 Craft Nights を起動中..."
echo ""
echo "📱 スマホ・タブレットはこのQRコードをスキャン："
echo ""
NODE_PATH=$(npm root -g) node -e "
  const qr = require('qrcode-terminal');
  qr.generate('${URL}', {small: true}, (code) => console.log(code));
"
echo ""
echo "🔗 ${URL}"
echo ""
echo "このウィンドウは閉じないでください。"
echo "---"
npm run dev
