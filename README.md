# SkillSprint

A beginner-friendly React app using Firebase Auth, Firestore, and OpenAI API.

## Features
- Email/password authentication (Firebase)
- Store/update user data (Firestore)
- Ask questions to OpenAI (GPT-3.5)
- Protected routes for Home and Profile

## Setup

### 1. Clone and Install
```
git clone <repo-url>
cd SkillSprint
npm install
```

### 2. Firebase Setup
- Go to [Firebase Console](https://console.firebase.google.com/)
- Create a project
- Enable **Email/Password** auth in Authentication > Sign-in method
- Create a Firestore database
- Copy your Firebase config from Project Settings
- Replace the placeholders in `src/firebase.js` with your config

### 3. OpenAI Setup
- Get your API key from [OpenAI](https://platform.openai.com/api-keys)
- Replace `YOUR_OPENAI_API_KEY` in `src/api/openai.js`

### 4. Run the App
```
npm start
```

## Usage
- Visit `/` for Welcome
- `/login` and `/signup` for auth
- `/home` to chat with AI (must be logged in)
- `/profile` to view/update your info

---

**This app is for learning and demo purposes.** 