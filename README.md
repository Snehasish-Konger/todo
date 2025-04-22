Here’s a developer‑focused README that explains setup, structure, and key flows. Feel free to adapt it for your repo.

---

## Tasks Tracker (React + Firebase + Mixpanel)

A single‑page to‑do app with anonymous & Google sign‑in, Firestore sync, and Mixpanel analytics. You can run it locally, extend its features, or deploy to Vercel in minutes.

---

### Features

- **Anonymous usage**: Users can add, delete, reorder, and archive tasks without login.  
- **Google sign‑in**: Link your anonymous session to a Google account. All past events merge under your user ID.  
- **Firestore persistence**: Tasks live in localStorage and, after login, sync to Firestore. Deletes and clears also update the database and archive old items.  
- **Mixpanel tracking**: Tracks all task events, auth events, and stitches anonymous history to your profile.  
- **Notion‑style UI**: Clean, white theme with tabs for “All Tasks” and “Archived”.

---

### Prerequisites

- Node 14+ and npm or Yarn  
- A Firebase project with Firestore enabled  
- A Mixpanel project and token  
- (Optional) Vercel account for hosting  

---

### Setup & Installation

1. **Clone the repo**  
   ```bash
   git clone https://github.com/your-username/tasks-tracker.git
   cd tasks-tracker
   ```

2. **Create `.env`** at project root (next to `package.json`):  
   ```dotenv
   REACT_APP_FIREBASE_API_KEY=…
   REACT_APP_FIREBASE_AUTH_DOMAIN=…
   REACT_APP_FIREBASE_PROJECT_ID=…
   REACT_APP_FIREBASE_STORAGE_BUCKET=…
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=…
   REACT_APP_FIREBASE_APP_ID=…

   REACT_APP_MIXPANEL_TOKEN=…
   ```
   > Restart your dev server after editing `.env`.

3. **Install dependencies**  
   ```bash
   npm install
   # or
   yarn install
   ```

4. **Run locally**  
   ```bash
   npm start
   # or
   yarn start
   ```
   Visit <http://localhost:3000>.

---

### Scripts

- `start` — Launches development server.  
- `build` — Creates production bundle in `build/`.  
- `test` — Runs tests (not configured by default).  
- `deploy` — You can link to Vercel (see below).

---

### Project Structure

```
src/
│
├── App.js         // Main UI and logic: auth, tabs, task flows
├── SignUp.js      // Top nav with user menu (login/sign‑out)
├── firebase.js    // Firebase config & exports (auth, db, provider)
├── assets/        // SVG icons: user, Google, cloud
├── index.js       // Entry point: renders App
└── styles/        // Tailwind setup (if separated)
```

---

### Core Components

#### `firebase.js`

- Reads config from `process.env.REACT_APP_*`.  
- Exports `auth`, `db`, and Google `provider`.

```js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  /* … */
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
```

#### `App.js`

- Initializes Mixpanel with `process.env.REACT_APP_MIXPANEL_TOKEN`.  
- Uses `onAuthStateChanged` to sign in anonymously or stitch on Google login.  
- Maintains `todos`, `activeTab` (`'all'` | `'archived'`), and input state.  
- Defines handlers:
  - `addTodo`, `deleteTodo`, `bulkDelete`, `clearCompleted`, `clearCache`: update local state, Firestore, and Mixpanel.  
  - Tab switching with `useEffect` to fetch `items` or `archived` arrays from Firestore.  
- Renders:
  - `<SignUp>` nav (login/sign‑out toggle)  
  - Tab bar (clickable)  
  - Task table with select, reorder, status toggle, and delete buttons  
  - `<ToastContainer>` for feedback  

#### `SignUp.js`

- Fixed top nav with brand on left and user‑menu on right.  
- Dropdown shows “Continue with Google” or “Sign Out.”  
- Calls `onLogin`, `onSignOut` props.  

---

### Analytics (Mixpanel)

- **Init** in `App.js`:
  ```js
  import mixpanel from 'mixpanel-browser';
  mixpanel.init(process.env.REACT_APP_MIXPANEL_TOKEN, { persistence: 'localStorage' });
  ```
- **trackEvent** calls `mixpanel.track(name, props)`.  
- On login: `mixpanel.alias(uid); mixpanel.identify(uid)` merges pre‑login events.

---

### Deployment on Vercel

1. Push to GitHub.  
2. In Vercel dashboard, import your repo.  
3. Set Environment Variables (same as `.env`).  
4. Use default Build Command (`npm run build`) and Output Directory (`build`).  
5. Click **Deploy**.  

Each push to `main` auto‑triggers a new deploy.

---

### Next Steps

- Add unit or integration tests.  
- Extend task properties (due dates, priorities).  
- Enable PostHog session recordings.  