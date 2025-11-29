#!/bin/bash
for i in {1..120}; do
  STATUS=$(curl -o /dev/null -s -w "%{http_code}" http://localhost:8080/)
  if [ "$STATUS" == "429" ]; then
    echo "Request $i: 429 Too Many Requests (BLOCKED)"
  else
    echo "Request $i: $STATUS"
  fi
done
