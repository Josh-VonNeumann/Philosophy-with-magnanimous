// Import Firebase modules
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, onAuthStateChanged, setPersistence, browserLocalPersistence } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Import Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase (only if not already initialized)
let auth, db;
let isFirebaseConfigured = false;

try {
    if (firebaseConfig.apiKey !== "YOUR-API-KEY") {
        // Check if Firebase app is already initialized
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        auth = getAuth(app);
        db = getFirestore(app);

        // Set persistence to LOCAL (survives page reloads)
        setPersistence(auth, browserLocalPersistence).catch(error => {
            console.error("Error setting persistence:", error);
        });

        isFirebaseConfigured = true;
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Check if already logged in - only redirect after auth state is stable
if (auth) {
    // Use a flag to track if we've checked after the initial null state
    let initialCheckDone = false;

    onAuthStateChanged(auth, (user) => {
        console.log('Auth state on login page:', user ? 'logged in' : 'not logged in', 'initialCheckDone:', initialCheckDone);

        // Skip the first check if user is null (initial state before auth loads)
        if (!user && !initialCheckDone) {
            initialCheckDone = true;
            return;
        }

        initialCheckDone = true;

        if (user) {
            // User is logged in, redirect to discussions
            console.log('User authenticated, redirecting to discussions...');
            window.location.replace('discussions.html');
        }
    });
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    // Toggle between login and signup forms
    const toggleButton = document.getElementById('toggleAuth');
    if (toggleButton) {
        toggleButton.addEventListener('click', function() {
            const loginForm = document.getElementById('loginForm');
            const signupForm = document.getElementById('signupForm');

            if (loginForm.style.display === 'none') {
                // Switch to login
                loginForm.style.display = 'block';
                signupForm.style.display = 'none';
                toggleButton.textContent = 'Create an account';
                document.getElementById('login-error').textContent = '';
            } else {
                // Switch to signup
                loginForm.style.display = 'none';
                signupForm.style.display = 'block';
                toggleButton.textContent = 'Already have an account? Log in';
                document.getElementById('signup-error').textContent = '';
            }
        });
    }
});

// Handle Login
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!isFirebaseConfigured) {
        document.getElementById('login-error').textContent = 'Firebase is not configured. Please check README.md';
        return;
    }

    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    const errorElement = document.getElementById('login-error');
    const submitButton = this.querySelector('button[type="submit"]');

    errorElement.textContent = '';
    submitButton.textContent = 'Logging in...';
    submitButton.disabled = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        // onAuthStateChanged will handle redirect
    } catch (error) {
        console.error("Login error:", error);
        let errorMessage = 'Login failed. Please try again.';

        if (error.code === 'auth/user-not-found') {
            errorMessage = 'No account found with this email.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Incorrect password.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many attempts. Please try again later.';
        }

        errorElement.textContent = errorMessage;
        submitButton.textContent = 'Log In';
        submitButton.disabled = false;
    }
    });
}

// Handle Signup
const signupForm = document.getElementById('signupForm');
if (signupForm) {
    signupForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!isFirebaseConfigured) {
        document.getElementById('signup-error').textContent = 'Firebase is not configured. Please check README.md';
        return;
    }

    const name = document.getElementById('signupName').value.trim();
    const email = document.getElementById('signupEmail').value.trim();
    const password = document.getElementById('signupPassword').value;
    const errorElement = document.getElementById('signup-error');
    const submitButton = this.querySelector('button[type="submit"]');

    if (!name) {
        errorElement.textContent = 'Please enter a display name.';
        return;
    }

    errorElement.textContent = '';
    submitButton.textContent = 'Creating account...';
    submitButton.disabled = true;

    try {
        // Create user account
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Create user profile in Firestore
        await setDoc(doc(db, 'users', user.uid), {
            displayName: name,
            email: email,
            photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=667eea&color=fff&size=200`,
            createdAt: new Date().toISOString()
        });

        // onAuthStateChanged will handle redirect
    } catch (error) {
        console.error("Signup error:", error);
        let errorMessage = 'Signup failed. Please try again.';

        if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'An account with this email already exists.';
        } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password should be at least 6 characters.';
        }

        errorElement.textContent = errorMessage;
        submitButton.textContent = 'Sign Up';
        submitButton.disabled = false;
    }
    });
}

// Show configuration message if Firebase not set up
if (!isFirebaseConfigured) {
    document.querySelector('.login-box').innerHTML = `
        <h1>Philosophical Discussions</h1>
        <div style="padding: 20px; background: #fff3cd; border: 1px solid #ffc107; border-radius: 8px; margin-top: 20px;">
            <strong>Setup Required</strong>
            <p style="margin: 10px 0 0 0;">
                Please configure Firebase Authentication to enable user accounts.
                Follow the instructions in README.md to get started.
            </p>
        </div>
    `;
}
