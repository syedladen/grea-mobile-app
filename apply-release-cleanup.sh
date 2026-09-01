#!/usr/bin/env bash
set -euo pipefail

echo "GREA Learn release cleanup"
echo "Working directory: $(pwd)"

if [ ! -f package.json ] || [ ! -d app ]; then
  echo "Run this from the grea-mobile-app repository root."
  exit 1
fi

# Remove known Expo starter routes/assets only.
rm -f "app/(tabs)/explore.tsx"
rm -f "app/modal.tsx"
rm -f "assets/images/partial-react-logo.png"
rm -f "assets/images/react-logo.png"
rm -f "assets/images/react-logo@2x.png"
rm -f "assets/images/react-logo@3x.png"
rm -f "scripts/reset-project.js"

# Package script cleanup without changing dependency versions.
node <<'NODE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json','utf8'));
pkg.name = 'grea-learn';
pkg.scripts = pkg.scripts || {};
pkg.scripts.typecheck = 'tsc --noEmit';
delete pkg.scripts['reset-project'];
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n');
NODE

# Remove the temporary integration debug logs we intentionally added.
python3 <<'PY'
from pathlib import Path
targets = [Path("src/lib/api.ts"), Path("app/assignment/[id].tsx")]
needles = (
    "console.log('[grea]",
    'console.log("ASSIGNMENT ',
    "console.log('ASSIGNMENT ",
)
for p in targets:
    if not p.exists():
        continue
    lines = p.read_text(encoding="utf-8").splitlines()
    lines = [line for line in lines if not any(n in line for n in needles)]
    p.write_text("\n".join(lines) + "\n", encoding="utf-8")
PY

# SafeAreaView migration only where currently imported from react-native.
python3 <<'PY'
from pathlib import Path
for p in Path("app").rglob("*.tsx"):
    text = p.read_text(encoding="utf-8")
    if "SafeAreaView" not in text or "from 'react-native'" not in text:
        continue
    # Remove SafeAreaView token from react-native named import conservatively.
    lines = text.splitlines()
    changed = False
    out = []
    for line in lines:
        if "from 'react-native';" in line and "SafeAreaView" in line:
            line = line.replace("SafeAreaView, ", "").replace(", SafeAreaView", "").replace("{ SafeAreaView }", "{}")
            changed = True
        out.append(line)
    text = "\n".join(out) + "\n"
    if changed and "react-native-safe-area-context" not in text:
        text = "import { SafeAreaView } from 'react-native-safe-area-context';\n" + text
        p.write_text(text, encoding="utf-8")
PY

echo "Running validation..."
npx tsc --noEmit
npm run lint

echo
echo "Release cleanup validated."
echo "Review the app in Expo Go, then commit:"
echo '  git add .'
echo '  git commit -m "Prepare GREA Learn release branding"'
echo '  git push origin main'
