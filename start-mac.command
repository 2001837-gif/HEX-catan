#!/bin/bash
cd "$(dirname "$0")"
command -v node >/dev/null || { echo "Node.js is not installed. Get it from https://nodejs.org then run this again."; read -n1; exit; }
[ -d node_modules ] || npm install
(sleep 2; open http://localhost:3000) &
node server/index.js
