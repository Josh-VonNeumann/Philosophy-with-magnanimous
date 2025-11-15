// Import Firebase modules
import { initializeApp, getApps } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signOut, updatePassword, EmailAuthProvider, reauthenticateWithCredential } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getFirestore, doc, getDoc, updateDoc } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';

// Import Firebase configuration
import { firebaseConfig } from './firebase-config.js';

// Initialize Firebase (only if not already initialized)
let auth, db, currentUser;

try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
    auth = getAuth(app);
    db = getFirestore(app);
} catch (error) {
    console.error("Firebase initialization error:", error);
}

// Check authentication and load profile
if (auth) {
    let initialCheckDone = false;
    let profileLoaded = false;

    onAuthStateChanged(auth, async (user) => {
        console.log('Auth state on profile page:', user ? 'logged in' : 'not logged in', 'initialCheckDone:', initialCheckDone);

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
        await loadUserProfile(user);
    });
}

// Load user profile data
async function loadUserProfile(user) {
    try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));

        if (userDoc.exists()) {
            const userData = userDoc.data();

            // Set profile picture
            document.getElementById('currentProfilePic').src = userData.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(userData.displayName)}&background=667eea&color=fff&size=200`;

            // Set display name
            document.getElementById('displayName').value = userData.displayName || '';

            // Set email
            document.getElementById('userEmail').textContent = userData.email || user.email;

            // Set member since date
            if (userData.createdAt) {
                const date = new Date(userData.createdAt);
                document.getElementById('memberSince').textContent = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
            }

            // Set photo URL input if custom photo exists
            if (userData.photoURL && !userData.photoURL.includes('ui-avatars.com')) {
                document.getElementById('photoURL').value = userData.photoURL;
            }
        }
    } catch (error) {
        console.error("Error loading profile:", error);
    }
}

// Update profile picture
document.getElementById('updatePhotoBtn').addEventListener('click', async function() {
    const photoURL = document.getElementById('photoURL').value.trim();

    if (!currentUser) return;

    try {
        this.textContent = 'Updating...';
        this.disabled = true;

        let finalPhotoURL = photoURL;

        // If no URL provided, generate from display name
        if (!photoURL) {
            const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
            const displayName = userDoc.data().displayName;
            finalPhotoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=667eea&color=fff&size=200`;
        }

        // Update in Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            photoURL: finalPhotoURL
        });

        // Update UI
        document.getElementById('currentProfilePic').src = finalPhotoURL;

        this.textContent = 'Updated!';
        setTimeout(() => {
            this.textContent = 'Update Photo';
            this.disabled = false;
        }, 2000);
    } catch (error) {
        console.error("Error updating photo:", error);
        alert('Error updating photo: ' + error.message);
        this.textContent = 'Update Photo';
        this.disabled = false;
    }
});

// Update display name
document.getElementById('updateNameForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!currentUser) return;

    const displayName = document.getElementById('displayName').value.trim();
    const successElement = document.getElementById('name-success');
    const errorElement = document.getElementById('name-error');
    const submitButton = this.querySelector('button[type="submit"]');

    errorElement.textContent = '';
    successElement.style.display = 'none';

    if (!displayName) {
        errorElement.textContent = 'Please enter a display name.';
        return;
    }

    try {
        submitButton.textContent = 'Updating...';
        submitButton.disabled = true;

        // Update in Firestore
        await updateDoc(doc(db, 'users', currentUser.uid), {
            displayName: displayName
        });

        // Update profile picture if using default
        const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
        const photoURL = userDoc.data().photoURL;
        if (!photoURL || photoURL.includes('ui-avatars.com')) {
            const newPhotoURL = `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=667eea&color=fff&size=200`;
            await updateDoc(doc(db, 'users', currentUser.uid), {
                photoURL: newPhotoURL
            });
            document.getElementById('currentProfilePic').src = newPhotoURL;
        }

        successElement.style.display = 'block';
        submitButton.textContent = 'Update Name';
        submitButton.disabled = false;

        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error("Error updating name:", error);
        errorElement.textContent = 'Error updating name: ' + error.message;
        submitButton.textContent = 'Update Name';
        submitButton.disabled = false;
    }
});

// Change password
document.getElementById('changePasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    if (!currentUser) return;

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const successElement = document.getElementById('password-success');
    const errorElement = document.getElementById('password-error');
    const submitButton = this.querySelector('button[type="submit"]');

    errorElement.textContent = '';
    successElement.style.display = 'none';

    // Validate passwords match
    if (newPassword !== confirmPassword) {
        errorElement.textContent = 'New passwords do not match.';
        return;
    }

    // Validate password length
    if (newPassword.length < 6) {
        errorElement.textContent = 'New password must be at least 6 characters.';
        return;
    }

    try {
        submitButton.textContent = 'Changing password...';
        submitButton.disabled = true;

        // Re-authenticate user
        const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
        await reauthenticateWithCredential(currentUser, credential);

        // Update password
        await updatePassword(currentUser, newPassword);

        // Clear form
        this.reset();
        successElement.style.display = 'block';
        submitButton.textContent = 'Change Password';
        submitButton.disabled = false;

        setTimeout(() => {
            successElement.style.display = 'none';
        }, 3000);
    } catch (error) {
        console.error("Error changing password:", error);
        let errorMessage = 'Error changing password.';

        if (error.code === 'auth/wrong-password') {
            errorMessage = 'Current password is incorrect.';
        } else if (error.code === 'auth/weak-password') {
            errorMessage = 'New password is too weak.';
        } else if (error.code === 'auth/requires-recent-login') {
            errorMessage = 'Please log out and log back in before changing your password.';
        }

        errorElement.textContent = errorMessage;
        submitButton.textContent = 'Change Password';
        submitButton.disabled = false;
    }
});

// Logout
document.getElementById('logoutBtn').addEventListener('click', async function() {
    try {
        await signOut(auth);
        window.location.href = 'index.html';
    } catch (error) {
        console.error("Error logging out:", error);
        alert('Error logging out. Please try again.');
    }
});
