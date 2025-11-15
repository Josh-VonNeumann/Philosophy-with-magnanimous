// Import Firebase modules
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, collection, query, orderBy, onSnapshot, addDoc, deleteDoc, doc, getDoc, serverTimestamp, where } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Import Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase (only if not already initialized)
let db, auth, currentUser;
let isFirebaseConfigured = false;

try {
    if (firebaseConfig.apiKey !== "YOUR-API-KEY") {
        const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
        db = getFirestore(app);
        auth = getAuth(app);
        isFirebaseConfigured = true;
    }
} catch (error) {
    console.error("Firebase initialization error in comments.js:", error);
}

// Track current user
if (auth && isFirebaseConfigured) {
    onAuthStateChanged(auth, (user) => {
        currentUser = user;
    });
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Format timestamp for comments
function formatCommentTime(timestamp) {
    if (!timestamp) return 'Just now';

    let date;
    if (timestamp.toDate) {
        date = timestamp.toDate();
    } else {
        date = new Date(timestamp);
    }

    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;

    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}

// Create comment HTML with current author profile
async function createCommentHTML(comment, commentId) {
    const { text, userName, userPhotoURL, userId, createdAt } = comment;

    // Fetch current author profile if userId exists
    let currentUserName = userName;
    let currentUserPhotoURL = userPhotoURL;

    if (userId) {
        try {
            const userDoc = await getDoc(doc(db, 'users', userId));
            if (userDoc.exists()) {
                const userData = userDoc.data();
                // Use current profile data
                currentUserName = userData.displayName || userName;
                currentUserPhotoURL = userData.photoURL || userPhotoURL;
            }
        } catch (error) {
            console.warn('Could not fetch current commenter profile, using stored data:', error);
            // Fall back to stored data
        }
    }

    // Check if current user is the comment author
    const isAuthor = currentUser && userId === currentUser.uid;
    const deleteButtonHTML = isAuthor ? `
        <button class="btn-delete-comment" data-comment-id="${commentId}" title="Delete comment">
            ✕
        </button>
    ` : '';

    return `
        <div class="comment" data-comment-id="${commentId}">
            <div class="comment-header" data-user-uid="${userId}">
                <img src="${currentUserPhotoURL}" alt="${escapeHtml(currentUserName)}" class="comment-avatar" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(currentUserName)}&background=667eea&color=fff&size=200'">
                <div class="comment-meta">
                    <span class="comment-author">${escapeHtml(currentUserName)}</span>
                    <span class="comment-time">${formatCommentTime(createdAt)}</span>
                </div>
                ${deleteButtonHTML}
            </div>
            <div class="comment-text">${escapeHtml(text)}</div>
        </div>
    `;
}

// Load comments for a specific discussion
function loadCommentsForDiscussion(discussionId, container) {
    if (!isFirebaseConfigured || !db) {
        container.innerHTML = '<p class="comments-error">Comments are not available. Please configure Firebase.</p>';
        return;
    }

    // Query comments for this discussion
    const q = query(
        collection(db, 'comments'),
        where('discussionId', '==', discussionId)
    );

    // Listen for real-time updates
    onSnapshot(q, async (querySnapshot) => {
        const commentsListDiv = container.querySelector('.comments-list');
        if (!commentsListDiv) return;

        if (querySnapshot.empty) {
            commentsListDiv.innerHTML = '<p class="no-comments">No comments yet. Be the first to share your thoughts!</p>';
            return;
        }

        // Collect all comments and sort by timestamp
        const comments = [];
        querySnapshot.forEach((doc) => {
            comments.push({ id: doc.id, data: doc.data() });
        });

        // Sort comments by createdAt timestamp (oldest first)
        comments.sort((a, b) => {
            const timeA = a.data.createdAt?.toMillis() || 0;
            const timeB = b.data.createdAt?.toMillis() || 0;
            return timeA - timeB;
        });

        // Generate HTML for sorted comments with current author profiles
        const commentPromises = comments.map(comment =>
            createCommentHTML(comment.data, comment.id)
        );

        const commentsHTMLArray = await Promise.all(commentPromises);
        const commentsHTML = commentsHTMLArray.join('');

        commentsListDiv.innerHTML = commentsHTML;

        // Add delete event listeners to all delete buttons
        container.querySelectorAll('.btn-delete-comment').forEach(btn => {
            btn.addEventListener('click', async function() {
                const commentId = this.getAttribute('data-comment-id');
                if (confirm('Are you sure you want to delete this comment?')) {
                    await deleteComment(commentId);
                }
            });
        });
    }, (error) => {
        console.error("Error loading comments:", error);
        const commentsListDiv = container.querySelector('.comments-list');
        if (commentsListDiv) {
            commentsListDiv.innerHTML = '<p class="comments-error">Error loading comments. Please try refreshing.</p>';
        }
    });
}

// Submit a new comment
async function submitComment(discussionId, commentText, container) {
    if (!currentUser) {
        alert('You must be logged in to comment.');
        return;
    }

    if (!commentText.trim()) {
        alert('Please enter a comment.');
        return;
    }

    try {
        // Get user profile data from auth (we'll use what's available)
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        let userName = currentUser.email.split('@')[0];
        let userPhotoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=667eea&color=fff&size=200`;

        if (userDoc.exists()) {
            const userData = userDoc.data();
            userName = userData.displayName || userName;
            userPhotoURL = userData.photoURL || userPhotoURL;
        }

        // Add comment to Firestore
        await addDoc(collection(db, 'comments'), {
            discussionId: discussionId,
            userId: currentUser.uid,
            userName: userName,
            userPhotoURL: userPhotoURL,
            text: commentText.trim(),
            createdAt: serverTimestamp()
        });

        // Clear the input
        const textarea = container.querySelector('.comment-input');
        if (textarea) {
            textarea.value = '';
        }

    } catch (error) {
        console.error("Error submitting comment:", error);
        alert('Error posting comment: ' + error.message);
    }
}

// Delete a comment
async function deleteComment(commentId) {
    try {
        await deleteDoc(doc(db, 'comments', commentId));
        console.log('Comment deleted successfully');
    } catch (error) {
        console.error('Error deleting comment:', error);
        alert('Error deleting comment: ' + error.message);
    }
}

// Initialize comments for all discussion containers
window.initializeComments = function() {
    if (!isFirebaseConfigured) {
        console.warn('Firebase not configured, comments disabled');
        return;
    }

    const commentContainers = document.querySelectorAll('.firebase-comments');

    commentContainers.forEach(container => {
        const discussionId = container.getAttribute('data-discussion-id');
        if (!discussionId) return;

        // Create comment UI structure
        container.innerHTML = `
            <div class="comments-list"></div>
            <div class="comment-form">
                <textarea class="comment-input" placeholder="Share your thoughts..." rows="3"></textarea>
                <button class="btn-submit-comment">Post Comment</button>
            </div>
        `;

        // Load existing comments
        loadCommentsForDiscussion(discussionId, container);

        // Add submit button event listener
        const submitBtn = container.querySelector('.btn-submit-comment');
        const textarea = container.querySelector('.comment-input');

        if (submitBtn && textarea) {
            submitBtn.addEventListener('click', async () => {
                await submitComment(discussionId, textarea.value, container);
            });

            // Allow Ctrl+Enter or Cmd+Enter to submit
            textarea.addEventListener('keydown', async (e) => {
                if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                    await submitComment(discussionId, textarea.value, container);
                }
            });
        }
    });
};
