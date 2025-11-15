# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

A philosophical discussions web application built with vanilla JavaScript and Firebase. Features user authentication, real-time post creation/deletion, profile management, and a comments system. The app is a pure client-side application using Firebase for backend services (Authentication, Firestore).

## Architecture

### Firebase Integration Pattern

All JavaScript files follow a consistent Firebase initialization pattern:

```javascript
import { initializeApp, getApps } from 'firebase-app.js';
// Initialize Firebase (only if not already initialized)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
```

**Critical**: Always check if Firebase is already initialized before calling `initializeApp()` to avoid duplicate initialization errors.

### Authentication Flow

The app uses a **deferred authentication check pattern** to avoid race conditions:

```javascript
let initialCheckDone = false;
onAuthStateChanged(auth, (user) => {
    // Skip the first null state (before auth loads)
    if (!user && !initialCheckDone) {
        initialCheckDone = true;
        return;
    }
    initialCheckDone = true;
    // Now handle actual auth state
});
```

**Why**: `onAuthStateChanged` fires immediately with `null`, then fires again with the actual user state. Without this pattern, users get incorrectly redirected to login even when authenticated.

### Page-Specific Logic

- **index.html** (auth.js): Login/signup page. Redirects authenticated users to discussions.html
- **discussions.html** (discussions.js): Main feed. Loads user profile, then discussions, then initializes comments
- **admin.html** (admin.js): Create new posts. Requires authentication and user profile to be loaded
- **profile.html** (profile.js): User profile management (display name, photo URL, password)

### Data Flow

1. User authenticates → `onAuthStateChanged` fires
2. Load user profile from Firestore `/users/{uid}`
3. Create UI elements (user menu, etc.)
4. Load discussions from Firestore `/discussions` collection (ordered by `createdAt` desc)
5. Initialize comments for each discussion from `/comments` collection

### Security Model

**Firestore Rules** (from README):
- `/discussions`: Authenticated users can read/write all discussions
- `/users/{userId}`: Users can only write their own profile, but can read all profiles
- `/comments`: Create requires all required fields; delete only by author

**XSS Prevention**: All user content is escaped via `escapeHtml()` before rendering.

## Common Tasks

### Local Development

Start a local web server (required for ES6 modules):

```bash
npx http-server -p 8080 -o
```

**Important**: Never open HTML files directly via `file://` - ES6 modules require HTTP(S).

### Testing Authentication

The app uses `browserLocalPersistence`, so authentication persists across page reloads. To test logout/login flows, use the browser's dev tools to clear Firebase storage or use the "Log Out" button.

### Adding New Fields to User Profiles

When adding new user profile fields:

1. Update the signup logic in **auth.js** (line 157-162)
2. Update the profile loading in **discussions.js** (loadUserProfile)
3. Update the profile page in **profile.js** (loadUserProfile)
4. Update Firestore security rules in Firebase Console

### Working with Comments

Comments are initialized **after** discussions are loaded:

```javascript
// In discussions.js after rendering discussions
if (typeof initializeComments === 'function') {
    initializeComments();
}
```

The `initializeComments()` function (defined in comments.js) finds all `.firebase-comments` containers and sets up real-time listeners.

### Deleting Posts

Only post authors can delete their posts. The delete button is conditionally rendered in `createDiscussionHTML()` (discussions.js:194-202) by comparing `author.uid === currentUser.uid`.

## Firebase Configuration

The app checks if Firebase is configured by testing: `firebaseConfig.apiKey !== "YOUR-API-KEY"`

If not configured, graceful fallback messages are shown instead of errors.

## Module System

The app uses **ES6 modules** with CDN imports from `https://www.gstatic.com/firebasejs/10.8.0/`. All modules are imported from CDN, not npm. There is no build step.

## Common Gotchas

1. **Double initialization**: Always check `getApps().length` before calling `initializeApp()`
2. **Auth race conditions**: Use the deferred check pattern shown above
3. **ES6 modules**: Require a web server, cannot use `file://` URLs
4. **Profile loading timing**: Wait for both authentication AND profile to load before rendering UI that depends on user data
5. **serverTimestamp()**: Use Firebase's `serverTimestamp()` for consistency, not `Date.now()` or `new Date()`

## File Structure

```
├── index.html              # Login/signup page
├── discussions.html        # Main discussions feed
├── admin.html              # Create post page
├── profile.html            # User profile management
├── auth.js                 # Authentication logic
├── discussions.js          # Display discussions + delete
├── admin.js                # Create posts
├── profile.js              # Profile updates (name, photo, password)
├── comments.js             # Real-time comments system
├── firebase-config.js      # Firebase project configuration
└── styles.css              # All styles (no CSS preprocessor)
```

## Deployment

Static site - can be deployed to Netlify, GitHub Pages, or Vercel without any build step. Just upload all files.
