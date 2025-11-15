// Import Firebase modules
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, addDoc, serverTimestamp, doc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Import Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase (only if not already initialized)
let db, auth, currentUser, userProfile;
try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    db = getFirestore(app);
    auth = getAuth(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Check authentication
if (auth) {
    let initialCheckDone = false;
    let profileLoaded = false;

    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state on admin page:', user ? 'logged in' : 'not logged in', 'initialCheckDone:', initialCheckDone);

        // Skip the first check if user is null (initial state before auth loads)
        if (!user && !initialCheckDone) {
            initialCheckDone = true;
            return;
        }

        initialCheckDone = true;

        if (!user) {
            console.log('No user found, redirecting to login...');
            window.location.replace('index.html');
            return;
        }

        if (profileLoaded) {
            return;
        }
        profileLoaded = true;

        currentUser = user;

        // Load user profile
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            if (userDoc.exists()) {
                userProfile = userDoc.data();
                console.log('User profile loaded on admin page');
            }
        } catch (error) {
            console.error("Error loading user profile:", error);
        }
    });
}

// Handle form submission
document.getElementById('createPostForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const title = document.getElementById('postTitle').value.trim();
    const content = document.getElementById('postContent').value.trim();

    if (!title || !content) {
        alert('Please fill in both title and content.');
        return;
    }

    // Check if Firebase is configured
    if (!db || firebaseConfig.apiKey === "YOUR-API-KEY") {
        alert('Firebase is not configured yet. Please follow the setup instructions in README.md to enable post creation.');
        return;
    }

    // Convert content to paragraphs (split by double newlines)
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);

    try {
        // Show loading state
        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Publishing...';
        submitButton.disabled = true;

        // Check if user is authenticated
        if (!currentUser || !userProfile) {
            alert('Please wait for your profile to load or refresh the page.');
            submitButton.textContent = originalText;
            submitButton.disabled = false;
            return;
        }

        // Add document to Firestore with author information
        await addDoc(collection(db, 'discussions'), {
            title: title,
            paragraphs: paragraphs,
            author: {
                uid: currentUser.uid,
                displayName: userProfile.displayName,
                photoURL: userProfile.photoURL
            },
            createdAt: serverTimestamp(),
            timestamp: Date.now() // For sorting fallback
        });

        // Show success message
        document.getElementById('createPostForm').style.display = 'none';
        document.getElementById('successMessage').style.display = 'block';

        // Reset form
        this.reset();
        submitButton.textContent = originalText;
        submitButton.disabled = false;

    } catch (error) {
        console.error("Error adding document: ", error);
        alert('Error publishing discussion. Please try again. Error: ' + error.message);

        // Reset button state
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.textContent = 'Publish Discussion';
        submitButton.disabled = false;
    }
});

// Auto-resize textarea as user types
document.getElementById('postContent').addEventListener('input', function() {
    this.style.height = 'auto';
    this.style.height = (this.scrollHeight) + 'px';
});
