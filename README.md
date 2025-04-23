# Tasks Tracker (React + Firebase + Mixpanel)

A fully-functional to-do app built with React, Firebase Authentication, Firestore, and Mixpanel analytics. This project demonstrates anonymous-to-authenticated state handling, real-time sync with cloud database, and meaningful product analytics instrumentation. Works locally or can be deployed to Vercel in minutes.

---

## Features

- **Anonymous usage**: Add, complete, delete, reorder, and archive tasks without logging in.
- **Google sign-in**: Continue with Google to link your session. All anonymous data and Mixpanel events get stitched into your authenticated profile.
- **Firestore sync**: Todo list persists locally and is pushed to Firestore when logged in. All state-changing actions (add, delete, archive) update both local and cloud.
- **Mixpanel instrumentation**: Tracks user behavior across anonymous and authenticated states. All key events include user context and properties.

---

## Prerequisites

- Node 14+ and npm or Yarn
- Firebase project with Authentication and Firestore enabled
- Mixpanel project and token
- (Optional) Vercel account for deployment

---

## Setup & Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Snehasish-Konger/todo.git
   cd tasks-tracker
   ```

2. **Configure environment variables**
   Create a `.env` file in the root with the following:
   ```env
   REACT_APP_FIREBASE_API_KEY=...
   REACT_APP_FIREBASE_AUTH_DOMAIN=...
   REACT_APP_FIREBASE_PROJECT_ID=...
   REACT_APP_FIREBASE_STORAGE_BUCKET=...
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
   REACT_APP_FIREBASE_APP_ID=...

   REACT_APP_MIXPANEL_TOKEN=...
   ```

3. **Install dependencies**
   ```bash
   yarn install
   # or
   npm install
   ```

4. **Run locally**
   ```bash
   yarn start
   # or
   npm start
   ```
   Visit [http://localhost:3000](http://localhost:3000)

---

## Scripts

| Script       | Description                      |
|--------------|----------------------------------|
| `start`      | Starts the development server    |
| `build`      | Compiles for production          |
| `test`       | Runs tests (not configured)      |
| `deploy`     | Deploys via Vercel (optional)    |

---

## Project Structure

```
src/
├── App.js         # Main logic: auth, tabs, task actions
├── SignUp.js      # Navigation bar and user menu
├── firebase.js    # Firebase config and exports
├── assets/        # Icons: user, Google, cloud
└── index.js       # Entry point
```

---

## Core Components

### `firebase.js`

```js
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  ...
};
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();
```

### `App.js`

- Detects auth state changes and switches between anonymous and authenticated users.
- On login, aliases Mixpanel anonymous ID to user ID.
- Manages local state and cloud sync (todos and archives).
- Automatically syncs archived/completed items and ensures cloud data consistency.
- Defines and tracks key events using `mixpanel.track`.

### `SignUp.js`

- Top-right navigation menu.
- Shows Google sign-in or sign-out.
- Disabled “Upload to Cloud” button for anonymous users (legacy, now auto-syncs).

---

## Analytics Design (Mixpanel)

We chose event tracking that aligns with product usage patterns. Every tracked event includes context such as:

- `userType`: `"anonymous"` or `"authenticated"`
- `text`, `label`: for added tasks
- `count`: for bulk operations or syncs

### Event List:

| Event Name                 | When Triggered                           |
|---------------------------|------------------------------------------|
| `App Opened`              | On load                                  |
| `User Authenticated`      | On login                                 |
| `Anonymous Todos Synced`  | On login, todos pushed to Firestore      |
| `Anonymous Archived Synced`| On login, archived pushed to Firestore   |
| `TodoAdded`               | On new task                              |
| `TodoDeleted`             | On task delete                           |
| `BulkDelete`              | On multi-task delete                     |
| `ClearedCompleted`        | On clearing completed tasks              |
| `CloudSync`, `CloudDelete`, etc | On cloud writes                     |
| `FetchAllTasks`           | On switching to "All Tasks" tab          |
| `FetchArchivedTasks`      | On switching to "Archived" tab           |

---

## Deployment (Vercel)

1. Push to GitHub.
2. Import the repository in [vercel.com](https://vercel.com).
3. Set environment variables (from `.env`).
4. Use:
   - **Build Command**: `yarn build`
   - **Output Directory**: `build`
5. Click **Deploy**.

---

## Product Thinking

This project was designed to validate how anonymous users interact with a product and how seamlessly we can transition them into registered users without losing context.

- Anonymous-first usage lowers friction and improves retention.
- Real-time Firestore ensures consistent state across devices post-login.
- Instrumentation in Mixpanel helps observe drop-offs, task patterns, and user quality pre and post-login.
- Task event instrumentation (add, archive, delete, complete) helps optimize feature prioritization in future iterations.

---

## Future Improvements

- Add due dates, tags, and priority to tasks
- Integrate session replay (PostHog or FullStory)
- Include basic testing and CI/CD
- Expand analytics to include task frequency and reopens
