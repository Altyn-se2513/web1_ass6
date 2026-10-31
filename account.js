/* My Account page — Firebase Authentication
   (register, log in, reset password, log out, show profile) */
import { auth } from './firebase.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail,
  updateProfile
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

// If Firebase failed to start, stop here (firebase.js already shows a message)
if (!auth) {
  console.warn('[Account] Firebase auth is not initialized — page will not work.');
  throw new Error('Firebase auth unavailable');
}

/* Turns Firebase error codes into clear messages for the user
   (switch statement). Before, users saw raw text like
   "Firebase: Error (auth/invalid-credential)." */
function friendlyAuthError(err) {
  switch (err && err.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'Wrong email or password.';
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try logging in.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/weak-password':
      return 'Password is too weak — use at least 6 characters.';
    case 'auth/missing-password':
      return 'Please enter your password.';
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a minute and try again.';
    case 'auth/network-request-failed':
      return 'No internet connection. Please try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/* 0. Log In / Sign Up tab switching
   This was missing: clicking "Sign Up" or the "Create one now" link
   did nothing. Now the two forms are shown/hidden correctly. */
(function () {
  const tabLogin      = document.getElementById('tab-login');
  const tabRegister   = document.getElementById('tab-register');
  const loginSection  = document.getElementById('login-section');
  const registerSection = document.getElementById('register-section');
  const linkToRegister  = document.getElementById('link-to-register');
  const linkToLogin     = document.getElementById('link-to-login');

  if (!loginSection || !registerSection) return;

  function showLogin() {
    loginSection.hidden = false;
    registerSection.hidden = true;
    if (tabLogin)    tabLogin.classList.add('active');
    if (tabRegister) tabRegister.classList.remove('active');
  }

  function showRegister() {
    loginSection.hidden = true;
    registerSection.hidden = false;
    if (tabRegister) tabRegister.classList.add('active');
    if (tabLogin)    tabLogin.classList.remove('active');
  }

  if (tabLogin)    tabLogin.addEventListener('click', showLogin);
  if (tabRegister) tabRegister.addEventListener('click', showRegister);

  if (linkToRegister) {
    linkToRegister.addEventListener('click', (e) => {
      e.preventDefault();
      showRegister();
    });
  }
  if (linkToLogin) {
    linkToLogin.addEventListener('click', (e) => {
      e.preventDefault();
      showLogin();
    });
  }
})();

/* 1. Registration: validate the form, then create the Firebase user */
(function () {
  const form = document.getElementById('register-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const errBox   = document.getElementById('register-error');
    const name     = document.getElementById('reg-name').value.trim();
    const email    = document.getElementById('reg-email').value.trim();
    const password = document.getElementById('reg-password').value;
    const confirm  = document.getElementById('reg-password-confirm').value;
    const terms    = document.getElementById('reg-terms').checked;

    const errors = [];

    if (!name) {
      errors.push('Name is required.');
    } else if (/\d/.test(name)) {
      errors.push('Name cannot contain digits.');
    } else if (!/^[A-Za-zА-Яа-яЁё][A-Za-zА-Яа-яЁё\s'-]{1,49}$/.test(name)) {
      errors.push('Name must contain only letters (2–50 characters), no special symbols.');
    }

    if (!email) {
      errors.push('Email is required.');
    } else if (!EMAIL_RE.test(email)) {
      errors.push('Please enter a valid email address.');
    }

    if (!password) {
      errors.push('Password is required.');
    } else if (password.length < 6) {
      errors.push('Password must be at least 6 characters.');
    }

    if (password !== confirm) {
      errors.push('Passwords do not match.');
    }

    if (!terms) {
      errors.push('You must agree to the terms.');
    }

    if (errors.length) {
      errBox.innerHTML = errors.map((m) => '• ' + m).join('<br>');
      errBox.hidden = false;
      return;
    }

    errBox.hidden = true;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name });

      const genre = document.getElementById('reg-genre').value;
      const goal  = document.getElementById('reg-goal').value;

      localStorage.setItem('bc_acc_genre_' + email, genre);
      localStorage.setItem('bc_acc_goal_'  + email, goal);
      localStorage.setItem('bc_acc_since_' + email, new Date().toISOString());

      form.reset();
    } catch (err) {
      errBox.textContent = friendlyAuthError(err);
      errBox.hidden = false;
    }
  });
})();


/* 2. Log in */
(function () {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const errBox   = document.getElementById('login-error');
    const email    = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    errBox.hidden = true;

    // Simple validation before calling Firebase
    if (!email || !password) {
      errBox.textContent = 'Please enter your email and password.';
      errBox.hidden = false;
      return;
    }
    if (!EMAIL_RE.test(email)) {
      errBox.textContent = 'Please enter a valid email address.';
      errBox.hidden = false;
      return;
    }

    try {
      await signInWithEmailAndPassword(auth, email, password);
      form.reset();
      if (window.Sound) window.Sound.playBeep(1000, 0.12);
    } catch (err) {
      errBox.textContent = friendlyAuthError(err);
      errBox.hidden = false;
    }
  });
})();


/* 3. Forgot password -> Firebase sends a reset email */
(function () {
  const link = document.getElementById('forgot-password-link');
  if (!link) return;

  link.addEventListener('click', async (e) => {
    e.preventDefault();

    const email = document.getElementById('login-email').value.trim();
    if (!email) {
      alert('Enter your email address first.');
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert('Password reset email sent. Check your inbox.');
    } catch (err) {
      alert(friendlyAuthError(err));
    }
  });
})();


/* 4. Log out */
(function () {
  const btn = document.getElementById('logout-btn');
  if (!btn) return;

  btn.addEventListener('click', async () => {
    try {
      await signOut(auth);
    } catch (err) {
      alert(friendlyAuthError(err));
    }
  });
})();


/* 5. Runs on every login / logout: switch between the form and the profile */
onAuthStateChanged(auth, (user) => {
  const authSection    = document.getElementById('auth-section');
  const profileSection = document.getElementById('profile-section');
  if (!authSection || !profileSection) return;

  if (user) {
    authSection.hidden = true;
    profileSection.hidden = false;

    const email = user.email || '';

    const userNameEl = document.getElementById('user-name');
    if (userNameEl) userNameEl.textContent = user.displayName || email.split('@')[0];

    const accNameEl = document.getElementById('acc-name');
    if (accNameEl) accNameEl.textContent = user.displayName || '—';

    const accEmailEl = document.getElementById('acc-email');
    if (accEmailEl) accEmailEl.textContent = email;

    const accGenreEl = document.getElementById('acc-genre');
    if (accGenreEl) accGenreEl.textContent = localStorage.getItem('bc_acc_genre_' + email) || '—';

    const accGoalEl = document.getElementById('acc-goal');
    if (accGoalEl) accGoalEl.textContent = localStorage.getItem('bc_acc_goal_' + email) || '20';

    const accSinceEl = document.getElementById('acc-since');
    const since = localStorage.getItem('bc_acc_since_' + email);
    if (accSinceEl) {
      accSinceEl.textContent = since
        ? new Date(since).toLocaleDateString('en-US', {
            year: 'numeric', month: 'long', day: 'numeric'
          })
        : '—';
    }

    if (typeof window.updateStreakUI === 'function')         window.updateStreakUI();
    if (typeof window.renderShelf === 'function')            window.renderShelf();
    if (typeof window.renderReadingProgress === 'function')  window.renderReadingProgress();

  } else {
    authSection.hidden = false;
    profileSection.hidden = true;
  }
});