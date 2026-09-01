# Apply to the current Codespace

Copy the CONTENTS of this `release-config` folder into the repository root.

That should overwrite:
- `app.json`
- `README.md`
- `assets/images/icon.png`
- `assets/images/android-icon-foreground.png`
- `assets/images/android-icon-background.png`
- `assets/images/android-icon-monochrome.png`
- `assets/images/splash-icon.png`
- `assets/images/favicon.png`

It also adds:
- `eas.json`
- `apply-release-cleanup.sh`

Then from the repository root run:

```bash
chmod +x apply-release-cleanup.sh
./apply-release-cleanup.sh
```

The script validates TypeScript and lint before you commit.

Final app identity:
- Name: GREA Learn
- iOS bundle ID: `org.globalrealestateacademy.grealearn`
- Android package: `org.globalrealestateacademy.grealearn`
