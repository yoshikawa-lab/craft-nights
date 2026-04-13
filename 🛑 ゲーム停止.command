#!/bin/bash
PORT=5173
PID=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$PID" ]; then
  kill $PID
  echo "🛑 Craft Nights を停止しました (port $PORT)"
else
  echo "Craft Nights は起動していません"
fi
sleep 2
