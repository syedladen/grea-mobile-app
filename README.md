# GREA Mobile

Global Real Estate Academy mobile LMS app built with Expo SDK 54, Expo Router, React Native, and TypeScript.

## Overview

This app connects to the GREA WordPress LMS backend at:

https://globalrealestateacademy.org/wp-json/grea-mobile/v1

It supports authentication with `expo-secure-store`, and synchronizes lessons, quizzes, assignments, and learner progress with the GREA LMS backend.

No Masteriyo consumer key or secret belongs in the mobile repository.

## Tech stack

- Expo SDK 54
- React Native
- Expo Router
- TypeScript
- `expo-secure-store` for token persistence

## Local setup

```bash
npm install
npx expo start --tunnel
```

## Type checking

```bash
npx tsc --noEmit
```

## Notes

- Authentication uses secure local storage and bearer token handling.
- Lesson completion, quizzes, assignments, and progress sync with the WordPress/GREA LMS backend.
- This repository is for the mobile client only; backend configuration stays on the server side.
