#!/bin/bash
PORT=8080
PID=$(lsof -ti:$PORT 2>/dev/null)
if [ -n "$PID" ]; then
  kill $PID
  echo "🛑 CraftNights を停止しました (port $PORT)"
else
  echo "CraftNights は起動していません"
fi
sleep 2
