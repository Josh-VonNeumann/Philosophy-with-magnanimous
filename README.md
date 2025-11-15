# Philosophical Discussions Website

A beautiful, modern web application for sharing philosophical discussions with friends. Features individual user accounts, real-time updates, profile management, and integrated commenting powered by Firebase and GitHub Discussions.

## Features

- **Individual user accounts** - Each friend has their own email/password account
- **User profiles** - Display names, profile pictures, and password management
- **Create posts through a web interface** - No need to edit HTML! Use the built-in admin panel
- **Delete your own posts** - Authors can delete their posts with a confirmation dialog
- **Author attribution** - Posts show who wrote them with profile picture
- Clean, readable design optimized for long-form text
- **Discussion forum** - Comment sections under each post powered by GitHub Discussions
- Real-time updates - New posts appear automatically for all users
- Fully responsive (works on mobile, tablet, and desktop)
- Free to host on platforms like Netlify or GitHub Pages

## Getting Started

### 1. Set Up Firebase (Required)

To create posts through the web interface, you need to set up Firebase (it's free!):

**A. Create a Firebase Project**

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or "Create a project"
3. Enter a project name (e.g., "philosophical-discussions")
4. Disable Google Analytics (not needed) and click "Create project"

**B. Enable Authentication**

1. In your Firebase project, click **Authentication** in the left menu
2. Click **Get started**
3. Click on the **Sign-in method** tab
4. Click on **Email/Password**
5. Toggle **Enable** to ON
6. Click **Save**

**C. Set Up Firestore Database**

1. In your Firebase project, click **Firestore Database** in the left menu
2. Click **Create database**
3. Choose **Start in production mode** (we'll add rules next)
4. Select a location closest to you and click **Enable**
5. Go to the **Rules** tab and replace with these rules:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /discussions/{document=**} {
      allow read, write: if request.auth != null;
    }
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

6. Click **Publish**

**D. Get Your Configuration**

1. Click the **gear icon** (⚙️) next to "Project Overview" → **Project settings**
2. Scroll down to **Your apps** section
3. Click the **</>** (Web) icon to add a web app
4. Give it a nickname (e.g., "Web App") and click **Register app**
5. Copy the `firebaseConfig` object shown

**E. Update Your Configuration File**

Open `firebase-config.js` and replace the placeholder values with your actual config:

```javascript
export const firebaseConfig = {
    apiKey: "AIza...",                          // Your actual values
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "1:123:web:abc..."
};
```

**That's it!** Your site is now ready to use.

### 2. Local Development

To test the site on your local computer, you need to run a local web server (because the site uses ES6 modules which don't work with `file://` URLs).

**Prerequisites:**
- Install [Node.js](https://nodejs.org/) (which includes npm and npx)

**Option A: Using npx (Recommended - No Installation Required)**
```bash
cd philosophical-discussions
npx http-server -p 8080 -o
```

**Option B: Install http-server globally**
```bash
npm install -g http-server
cd philosophical-discussions
http-server -p 8080 -o
```

The site will open automatically in your browser at `http://localhost:8080`

**Important:** Do not try to open `index.html` directly in your browser - it won't work due to CORS restrictions with ES6 modules. Always use a local web server for development.

### 3. Using the Site

**First Time Setup:**
1. Start the local server (see section 2 above) or visit your deployed site
2. Click "Create an account"
3. Enter your display name, email, and password
4. You'll be automatically logged in

**For Your Friends:**
- Share the site URL with your friends
- They can create their own accounts
- Each person will have their own profile with display name and picture

**Creating Discussions:**
1. After logging in, click "+ Create New Discussion"
2. Write your philosophical thoughts
3. Click "Publish" - your post appears instantly for everyone!

**Deleting Your Posts:**
- You'll see a red "Delete Post" button on your own posts
- Click it and confirm to permanently delete the post
- Only the author can delete their own posts

**Managing Your Profile:**
- Click on your name/avatar in the top right
- Select "My Profile" to:
  - Change your display name
  - Update your profile picture
  - Change your password
  - View account info
  - Log out

### 4. Set Up Discussion Forum (Optional but Recommended)

The site includes a discussion forum where your friends can comment and discuss each post. It uses **Giscus**, a free commenting system powered by GitHub Discussions.

#### Step-by-Step Setup:

**A. Create a GitHub Account & Repository**

1. If you don't have one, create a free account at [github.com](https://github.com)
2. Create a new **public** repository (you can name it `philosophical-discussions`)
3. Upload all your website files to this repository

**B. Enable GitHub Discussions**

1. Go to your repository on GitHub
2. Click **Settings** tab
3. Scroll down to **Features** section
4. Check the box for **Discussions**
5. Go to the **Discussions** tab that now appears
6. Create a new category called "General" (or any name you prefer)

**C. Install Giscus App**

1. Visit [https://github.com/apps/giscus](https://github.com/apps/giscus)
2. Click **Install**
3. Select your repository and grant access

**D. Configure Giscus**

1. Go to [https://giscus.app](https://giscus.app)
2. Enter your repository in the format: `your-username/your-repo-name`
3. The tool will verify your repository
4. Under "Discussion Category", select "General" (or your category name)
5. Scroll down to the **Configuration** section
6. Copy the values shown (you'll need `data-repo-id` and `data-category-id`)

**E. Update Your Configuration File**

Open `giscus-config.js` and replace the placeholder values:

```javascript
const GISCUS_CONFIG = {
    repo: "your-username/philosophical-discussions",     // Your repo
    repoId: "R_xxxxxxxxxxxxx",                          // From giscus.app
    category: "General",                                 // Your category name
    categoryId: "DIC_xxxxxxxxxxxxx",                    // From giscus.app
    // ... rest stays the same
};
```

**That's it!** When you deploy your site, each discussion post will have a comment section where you and your friends can engage in thoughtful dialogue.

**Note:** Comments will be stored as GitHub Discussions in your repository. This is free, doesn't require a database, and works perfectly with static sites.

## Deployment Instructions

### Option 1: Netlify (Recommended)

1. Create a free account at [netlify.com](https://www.netlify.com)
2. Drag and drop the entire `philosophical-discussions` folder onto Netlify's dashboard
3. Your site will be live instantly with a URL like `your-site-name.netlify.app`
4. You can customize the site name in Netlify's settings

### Option 2: GitHub Pages

1. Create a free account at [github.com](https://github.com)
2. Create a new repository (name it anything you like)
3. Upload all files (index.html, discussions.html, styles.css, script.js) to the repository
4. Go to Settings → Pages
5. Under "Source", select your main branch
6. Your site will be live at `yourusername.github.io/repository-name`

### Option 3: Vercel

1. Create a free account at [vercel.com](https://vercel.com)
2. Click "New Project" and import from Git or upload files
3. Your site will be deployed instantly

## Customization

### Change Colors

Edit `styles.css` to customize colors. The main gradient colors are:
- Primary gradient: `#667eea` and `#764ba2` (purple/blue)
- Background: `#f8f9fa` (light gray)
- Text: `#2c3e50` (dark blue-gray)

### Change Fonts

Replace `'Georgia', 'Times New Roman', serif` in `styles.css` with your preferred font. You can use Google Fonts for more options.

## File Structure

```
philosophical-discussions/
├── index.html          # Login/Signup page
├── discussions.html    # Main page showing all discussions
├── admin.html          # Create new post page
├── profile.html        # User profile management page
├── styles.css          # All styling
├── auth.js             # Authentication (login/signup)
├── admin.js            # Create post functionality
├── discussions.js      # Load and display posts
├── profile.js          # Profile management functionality
├── firebase-config.js  # Firebase configuration
├── giscus-config.js    # Discussion forum configuration
└── README.md           # This file
```

## Managing Users and Posts

### Deleting User Accounts (Firebase Console)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Authentication** → **Users**
4. Find the user account you want to delete
5. Click the three dots menu (⋮) → **Delete account**

### Deleting Posts (Firebase Console)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project
3. Go to **Firestore Database**
4. Click on the **discussions** collection
5. Click on the post document you want to delete
6. Click the trash icon (🗑️) at the top

**Note:** Users can also delete their own posts directly from the website using the "Delete Post" button.

## Security Note

This site uses Firebase Authentication, which provides secure, industry-standard user authentication. However, keep in mind:

- **Public signup**: Anyone can create an account by default. If you want to restrict who can join:
  - You can manually delete unwanted users from Firebase Console (see above)
  - Or implement email verification/approval (requires additional setup)
- **Firestore rules**: The provided rules allow any authenticated user to read/write discussions. This is suitable for a trusted group of friends.
- **Profile pictures**: Using URL-based profile pictures is convenient but means anyone could use any image URL.

## Support

If you need help or want to customize further, feel free to ask!

---

Enjoy your philosophical discussions!
