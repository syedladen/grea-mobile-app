# GREA Learn

Official mobile LMS for Global Real Estate Academy.

## Stack

- Expo SDK 54
- React Native
- Expo Router
- TypeScript
- `expo-secure-store` for authenticated session storage

## Backend

`https://globalrealestateacademy.org/wp-json/grea-mobile/v1`

Lessons, quizzes, assignments, files, and course progress synchronize with the Global Real Estate Academy WordPress/Masteriyo LMS.

## Local development

```bash
npm install
npx expo start --tunnel
```

## Validation

```bash
npx tsc --noEmit
npm run lint
```

## Security

Never commit Masteriyo consumer keys, consumer secrets, WordPress passwords, private API credentials, or student authentication tokens to this repository.
