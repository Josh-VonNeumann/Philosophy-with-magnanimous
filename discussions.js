// Import Firebase modules
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Import Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase (only if not already initialized)
let db, auth, currentUser, userProfile;
let isFirebaseConfigured = false;

try {
    if (firebaseConfig.apiKey !== "YOUR-API-KEY") {
        // Check if Firebase app is already initialized
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        db = getFirestore(app);
        auth = getAuth(app);
        isFirebaseConfigured = true;
    }
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Profile listener management system for real-time updates
const profileListeners = new Map(); // uid -> unsubscribe function
const profileCache = new Map();     // uid -> {displayName, photoURL}
const profileUIElements = new Map(); // uid -> Set of DOM elements

// Subscribe to a user's profile changes
function subscribeToUserProfile(uid) {
    if (!uid || profileListeners.has(uid)) return; // Already subscribed or invalid UID

    const unsubscribe = onSnapshot(doc(db, 'users', uid), (docSnap) => {
        if (docSnap.exists()) {
            const profileData = docSnap.data();
            profileCache.set(uid, profileData);
            console.log(`Profile updated for UID ${uid}:`, profileData.displayName);
            updateProfileUIElements(uid, profileData);
        }
    }, (error) => {
        console.warn(`Error listening to profile for UID ${uid}:`, error);
    });

    profileListeners.set(uid, unsubscribe);
}

// Update all DOM elements for a specific user when their profile changes
function updateProfileUIElements(uid, profileData) {
    const elements = profileUIElements.get(uid);
    if (!elements || elements.size === 0) return;

    elements.forEach(element => {
        // Update avatar images
        const avatar = element.querySelector('.author-avatar, .comment-avatar');
        if (avatar) {
            avatar.src = profileData.photoURL;
            avatar.alt = profileData.displayName;
        }

        // Update name spans
        const nameSpan = element.querySelector('.author-name, .comment-author');
        if (nameSpan) {
            nameSpan.textContent = profileData.displayName;
        }
    });

    console.log(`Updated ${elements.size} UI element(s) for ${profileData.displayName}`);
}

// Register all profile elements and set up listeners
function registerProfileElements() {
    // Clear previous registrations
    profileUIElements.clear();

    // Find all elements with data-user-uid attribute
    document.querySelectorAll('[data-user-uid]').forEach(element => {
        const uid = element.getAttribute('data-user-uid');
        if (!uid) return;

        // Add element to tracking map
        if (!profileUIElements.has(uid)) {
            profileUIElements.set(uid, new Set());
        }
        profileUIElements.get(uid).add(element);

        // Subscribe to profile updates for this user
        subscribeToUserProfile(uid);
    });

    console.log(`Registered ${profileUIElements.size} unique user profiles for real-time updates`);
}

// Cleanup profile listeners (call when leaving page)
function cleanupProfileListeners() {
    profileListeners.forEach(unsubscribe => unsubscribe());
    profileListeners.clear();
    profileUIElements.clear();
    profileCache.clear();
}

// Show loading indicator
function showLoading() {
    const container = document.getElementById('dynamicDiscussions');
    if (container) {
        container.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
                <p>Loading...</p>
            </div>
        `;
    }
}

// Show create button
function showCreateButton() {
    const createBtn = document.querySelector('.btn-create-post');
    if (createBtn) {
        createBtn.style.display = 'inline-block';
    }
}

// Check authentication and load everything AFTER auth completes
if (auth && isFirebaseConfigured) {
    // Show loading while checking auth
    showLoading();

    let initialCheckDone = false;
    let authenticationComplete = false;

    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state on discussions page:', user ? 'logged in' : 'not logged in', 'initialCheckDone:', initialCheckDone);

        // Skip the first check if user is null (initial state before auth loads)
        if (!user && !initialCheckDone) {
            initialCheckDone = true;
            console.log('Skipping initial null state, waiting for auth to load...');
            return;
        }

        initialCheckDone = true;

        // If still no user after initial check, redirect to login
        if (!user) {
            console.log('No user found after auth loaded, redirecting to login...');
            window.location.replace('index.html');
            return;
        }

        // Prevent duplicate processing
        if (authenticationComplete) {
            return;
        }
        authenticationComplete = true;

        currentUser = user;

        // Load user profile and create user menu
        try {
            const userDoc = await getDoc(doc(db, 'users', user.uid));

            if (userDoc.exists()) {
                userProfile = userDoc.data();
                console.log('User profile loaded successfully');
            } else {
                // Create default profile if it doesn't exist
                console.warn('User profile not found in Firestore, creating default profile');
                userProfile = {
                    displayName: user.email.split('@')[0],
                    email: user.email,
                    photoURL: `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email.split('@')[0])}&background=667eea&color=fff&size=200`,
                    createdAt: new Date().toISOString()
                };
                // Save the default profile to Firestore
                await setDoc(doc(db, 'users', user.uid), userProfile);
            }

            // Create user menu
            createUserMenu(userProfile);

            // Show create button
            showCreateButton();

            // NOW load discussions after auth and profile are ready
            loadDiscussions();

        } catch (error) {
            console.error("Error loading user profile:", error);
            // Show error but still allow user to see discussions
            const container = document.getElementById('dynamicDiscussions');
            container.innerHTML = `
                <div class="error-banner">
                    <strong>Profile Error</strong>
                    <p>Could not load your profile. Some features may be limited.</p>
                </div>
            `;
            // Still try to load discussions
            setTimeout(loadDiscussions, 1000);
        }
    });
}

// Create user menu
function createUserMenu(profile) {
    const nav = document.querySelector('.discussions-nav');
    if (!nav) return;

    // Remove existing user menu if it exists
    const existingMenu = nav.querySelector('.user-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    const userMenu = document.createElement('div');
    userMenu.className = 'user-menu';
    userMenu.innerHTML = `
        <img src="${profile.photoURL}" alt="${profile.displayName}" class="user-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName)}&background=667eea&color=fff&size=200'">
        <span class="user-name">${escapeHtml(profile.displayName)}</span>
        <div class="user-dropdown">
            <a href="profile.html">My Profile</a>
            <a href="#" id="logoutLink">Log Out</a>
        </div>
    `;

    nav.appendChild(userMenu);

    // Add logout functionality
    document.getElementById('logoutLink').addEventListener('click', async function(e) {
        e.preventDefault();
        try {
            await signOut(auth);
            window.location.href = 'index.html';
        } catch (error) {
            console.error("Error logging out:", error);
        }
    });
}

// Format date
function formatDate(timestamp) {
    if (!timestamp) return 'Recently';

    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }

    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return 'Posted on ' + date.toLocaleDateString('en-US', options);
}

// Create discussion HTML with current author profile
async function createDiscussionHTML(discussion, docId) {
    const { title, paragraphs, createdAt, timestamp, author } = discussion;

    const paragraphsHTML = paragraphs.map(p => `<p>${escapeHtml(p)}</p>`).join('\n                ');

    // Fetch current author profile if author UID exists
    let currentAuthor = author; // Default to stored author data
    if (author && author.uid) {
        try {
            const authorDoc = await getDoc(doc(db, 'users', author.uid));
            if (authorDoc.exists()) {
                const authorData = authorDoc.data();
                // Use current profile data
                currentAuthor = {
                    uid: author.uid,
                    displayName: authorData.displayName,
                    photoURL: authorData.photoURL
                };
                console.log(`Updated author profile for post "${title}":`, currentAuthor.displayName);
            }
        } catch (error) {
            console.warn('Could not fetch current author profile, using stored data:', error);
            // Fall back to stored author data
        }
    }

    // Create author section if author info exists
    let authorHTML = '';
    if (currentAuthor && currentAuthor.displayName) {
        authorHTML = `
            <div class="post-author" data-user-uid="${currentAuthor.uid}">
                <img src="${currentAuthor.photoURL}" alt="${escapeHtml(currentAuthor.displayName)}" class="author-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(currentAuthor.displayName)}&background=667eea&color=fff&size=200'">
                <span class="author-name">${escapeHtml(currentAuthor.displayName)}</span>
            </div>
        `;
    }

    // Add delete button if current user is the author
    let deleteButtonHTML = '';
    if (currentUser && currentAuthor && currentAuthor.uid === currentUser.uid) {
        deleteButtonHTML = `
            <button class="btn-delete-post" data-doc-id="${docId}" onclick="deletePost('${docId}', '${escapeHtml(title)}')">
                Delete Post
            </button>
        `;
    }

    return `
        <article class="discussion">
            <div class="discussion-header">
                <h2>${escapeHtml(title)}</h2>
                <div class="discussion-meta">
                    ${authorHTML}
                    <p class="meta">${formatDate(createdAt || timestamp)}</p>
                </div>
                ${deleteButtonHTML}
            </div>
            <div class="discussion-content">
                ${paragraphsHTML}
            </div>
            <div class="comments-section">
                <h3 class="comments-title">Discussion & Comments</h3>
                <div class="firebase-comments" data-discussion-id="${docId}"></div>
            </div>
        </article>
    `;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Load discussions from Firebase
function loadDiscussions() {
    if (!isFirebaseConfigured) {
        // Show message if Firebase is not configured
        document.getElementById('dynamicDiscussions').innerHTML = `
            <div class="info-banner">
                <strong>Setup Required</strong>
                <p>Please set up Firebase by following the instructions in README.md to enable discussions.</p>
            </div>
        `;
        return;
    }

    // Show loading while fetching
    const discussionsContainer = document.getElementById('dynamicDiscussions');
    discussionsContainer.innerHTML = `
        <div class="loading-state">
            <div class="loading-spinner"></div>
            <p>Loading discussions...</p>
        </div>
    `;

    // Query discussions ordered by creation date (newest first)
    const q = query(collection(db, 'discussions'), orderBy('createdAt', 'desc'));

    // Listen for real-time updates
    onSnapshot(q, async (querySnapshot) => {
        if (querySnapshot.empty) {
            discussionsContainer.innerHTML = `
                <div class="empty-state">
                    <h2>No discussions yet</h2>
                    <p>Be the first to share your philosophical thoughts!</p>
                    <a href="admin.html" class="btn-primary">Create First Discussion</a>
                </div>
            `;
            return;
        }

        // Create array of promises to fetch all discussion HTML with current author profiles
        const discussionPromises = [];
        querySnapshot.forEach((doc) => {
            discussionPromises.push(createDiscussionHTML(doc.data(), doc.id));
        });

        // Wait for all discussions to be rendered with current author data
        const discussionsHTMLArray = await Promise.all(discussionPromises);
        const discussionsHTML = discussionsHTMLArray.join('');

        discussionsContainer.innerHTML = discussionsHTML;

        // Initialize Firebase comments for all discussions
        if (typeof initializeComments === 'function') {
            initializeComments();
        }

        // Register profile elements for real-time updates
        // Use setTimeout to allow comments to render first
        setTimeout(() => {
            registerProfileElements();
        }, 100);
    }, (error) => {
        console.error("Error loading discussions:", error);
        discussionsContainer.innerHTML = `
            <div class="error-banner">
                <strong>Error loading discussions</strong>
                <p>${error.message}</p>
                <p>Please try refreshing the page.</p>
            </div>
        `;
    });
}

// Delete post function
window.deletePost = async function(docId, title) {
    if (!confirm(`Are you sure you want to delete "${title}"?\n\nThis action cannot be undone.`)) {
        return;
    }

    try {
        await deleteDoc(doc(db, 'discussions', docId));
        console.log('Post deleted successfully');
    } catch (error) {
        console.error('Error deleting post:', error);
        alert('Error deleting post: ' + error.message);
    }
};

// Cleanup profile listeners when navigating away
window.addEventListener('beforeunload', cleanupProfileListeners);
