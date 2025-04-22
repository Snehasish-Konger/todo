// src/App.js
import React, { useState, useEffect } from "react";
import SignUp from "./Signup";
import { auth, provider, db } from "./firebase";
import {
  signInWithPopup,
  signInAnonymously,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import mixpanel from "mixpanel-browser";

// Initialize Mixpanel
// Replace 'YOUR_MIXPANEL_TOKEN' with your actual Mixpanel token
mixpanel.init(process.env.REACT_APP_MIXPANEL_TOKEN, { debug: true });

// Track event helper function
const trackEvent = (eventName, properties = {}) => {
  mixpanel.track(eventName, properties);
};

function App() {
  const [user, setUser] = useState(null);
  const [todos, setTodos] = useState([]);
  const [input, setInput] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [labelInput, setLabelInput] = useState("");
  const [anonymousId, setAnonymousId] = useState(null);

  const toggleSelect = (id) => {
    setTodos(
      todos.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
    trackEvent("Todo Selected", { id });
  };

  useEffect(() => {
    // Generate or retrieve anonymousId for tracking
    const storedAnonymousId = localStorage.getItem("anonymousId");
    if (storedAnonymousId) {
      setAnonymousId(storedAnonymousId);
      mixpanel.identify(storedAnonymousId);
    } else {
      const newAnonymousId = `anon-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}`;
      localStorage.setItem("anonymousId", newAnonymousId);
      setAnonymousId(newAnonymousId);
      mixpanel.identify(newAnonymousId);
    }

    // Track app open event
    trackEvent("App Opened");

    const unsub = onAuthStateChanged(auth, async (u) => {
      if (u) {
        setUser(u);

        // If user is not anonymous, identify them in Mixpanel
        if (!u.isAnonymous) {
          // First, alias the anonymous user to their authenticated ID
          if (anonymousId && anonymousId !== u.uid) {
            mixpanel.alias(u.uid, anonymousId);
          }

          // Now identify them with their actual ID
          mixpanel.identify(u.uid);

          // Set user properties
          mixpanel.people.set({
            $email: u.email,
            $name: u.displayName || u.email,
            $last_login: new Date().toISOString(),
            userType: "authenticated",
          });

          // Track login event
          trackEvent("User Authenticated", {
            method: "Google",
            userId: u.uid,
            previouslyAnonymous: Boolean(localStorage.getItem("todos")),
          });

          // Sync local anonymous todos to user's cloud todos
          if (localStorage.getItem("todos")) {
            const anon = JSON.parse(localStorage.getItem("todos"));
            await setDoc(
              doc(db, "todos", u.uid),
              { items: anon, archived: [] },
              { merge: true }
            );
            localStorage.removeItem("todos");
            toast.success("Synced your todos to Cloud");
            trackEvent("Anonymous Todos Synced", { count: anon.length });
          }
        } else {
          // If user is anonymous, make sure we're tracking them as anonymous
          mixpanel.people.set({
            userType: "anonymous",
          });
          trackEvent("Anonymous Session Started");
        }
      } else {
        await signInAnonymously(auth);
      }
    });
    return unsub;
  }, [anonymousId]);

  useEffect(() => {
    const loadTab = async () => {
      if (!user || user.isAnonymous) return;

      const snap = await getDoc(doc(db, "todos", user.uid));
      if (!snap.exists()) return;

      const data = snap.data();
      if (activeTab === "all") {
        setTodos(data.items || []);
        trackEvent("FetchAllTasks", { count: (data.items || []).length });
      } else {
        setTodos(data.archived || []);
        trackEvent("FetchArchivedTasks", {
          count: (data.archived || []).length,
        });
      }
    };

    loadTab();
  }, [activeTab, user]);

  // Load from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("todos");
    if (stored) {
      const parsedTodos = JSON.parse(stored);
      setTodos(parsedTodos);
      trackEvent("Local Todos Loaded", { count: parsedTodos.length });
    }
  }, []);

  // Fetch cloud todos if logged in
  useEffect(() => {
    if (user && !user.isAnonymous) {
      (async () => {
        const snap = await getDoc(doc(db, "todos", user.uid));
        if (snap.exists()) {
          const cloud = snap.data().items || [];
          setTodos(cloud);
          localStorage.setItem("todos", JSON.stringify(cloud));
          toast.info(`Loaded ${cloud.length} from Cloud`);
          trackEvent("CloudTodosLoaded", { count: cloud.length });
        }
      })();
    }
  }, [user]);

  // Persist to localStorage on change
  useEffect(() => {
    localStorage.setItem("todos", JSON.stringify(todos));
  }, [todos]);

  // Auth handlers
  const handleLogin = async () => {
    try {
      // Capture the anonymous ID before login
      const currentAnonymousId = anonymousId;

      // Proceed with login
      await signInWithPopup(auth, provider);
      toast.success("Logged in");

      // The auth state change will handle identifying the user in Mixpanel
      trackEvent("Login Attempt Successful", {
        previousAnonymousId: currentAnonymousId,
      });
    } catch (error) {
      toast.error("Login failed");
      trackEvent("Login Attempt Failed", { error: error.message });
    }
  };

  const handleSignOut = async () => {
    try {
      // Track before sign out so we still have the user ID
      trackEvent("SignOut Initiated", { userId: user?.uid });

      await signOut(auth);

      // Reset to anonymous tracking
      const newAnonymousId = `anon-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 10)}`;
      localStorage.setItem("anonymousId", newAnonymousId);
      setAnonymousId(newAnonymousId);
      mixpanel.identify(newAnonymousId);

      toast.info("Signed out");
      trackEvent("SignedOut");
    } catch (error) {
      toast.error("Sign‑out failed");
      trackEvent("SignOut Failed", { error: error.message });
    }
  };

  const handleUpload = async () => {
    if (!user || user.isAnonymous) {
      toast.warn("Please log in first");
      trackEvent("Upload Attempt Failed", { reason: "Not logged in" });
      return;
    }
    const local = JSON.parse(localStorage.getItem("todos") || "[]");
    const ref = doc(db, "todos", user.uid);
    const snap = await getDoc(ref);
    const existing = snap.exists() ? snap.data().items || [] : [];
    const newItems = local.filter((t) => !existing.some((e) => e.id === t.id));
    if (!newItems.length) {
      toast.info("All caught up");
      trackEvent("Upload Attempt", { status: "No new items" });
      return;
    }
    const archived = snap.exists() ? snap.data().archived || [] : [];
    const completed = local.filter((t) => t.completed);
    const removed = existing.filter((e) => !local.some((t) => t.id === e.id));
    await setDoc(ref, {
      items: [...existing, ...newItems],
      archived: [...archived, ...completed, ...removed],
    });
    toast.success(`${newItems.length} new item(s) uploaded`);
    trackEvent("UploadedNewItems", { count: newItems.length });
  };

  // To‑do handlers
  // After: local + cloud sync
  const addTodo = async () => {
    const text = input.trim();
    if (!text) return;

    const newTodo = {
      id: Date.now(),
      text,
      label: labelInput.trim(),
      completed: false,
      selected: false,
    };

    // 1) Update local state
    setTodos((prev) => [newTodo, ...prev]);
    toast.success(`Added: ${text}`);
    trackEvent("TodoAdded", {
      text,
      label: newTodo.label,
      userType: user?.isAnonymous ? "anonymous" : "authenticated",
    });
    setInput("");
    setLabelInput("");

    // 2) If signed in, also push to Firestore
    if (user && !user.isAnonymous) {
      const ref = doc(db, "todos", user.uid);
      const snap = await getDoc(ref);
      const existing = snap.exists() ? snap.data().items || [] : [];
      await setDoc(
        ref,
        {
          items: [newTodo, ...existing],
          archived: snap.exists() ? snap.data().archived || [] : [],
        },
        { merge: true }
      );
      toast.info("Synced new task to Cloud");
      trackEvent("CloudSync", { id: newTodo.id });
    }
  };

  const deleteTodo = async (id) => {
    // Remove locally
    const updated = todos.filter((t) => t.id !== id);
    setTodos(updated);
    toast.info("Deleted a task");
    trackEvent("TodoDeleted", {
      id,
      userType: user?.isAnonymous ? "anonymous" : "authenticated",
    });

    // Persist to Firestore
    if (user && !user.isAnonymous) {
      const ref = doc(db, "todos", user.uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      await setDoc(
        ref,
        {
          items: updated,
          // keep archived untouched
          archived: data.archived || [],
        },
        { merge: true }
      );
      toast.success("Removed task in Cloud");
      trackEvent("CloudDelete", { id });
    }
  };

  const toggleComplete = (id) => {
    setTodos(
      todos.map((t) => (t.id === id ? { ...t, completed: !t.completed } : t))
    );
    trackEvent("TodoToggled", {
      id,
      userType: user?.isAnonymous ? "anonymous" : "authenticated",
    });
  };

  const bulkDelete = async () => {
    // Identify and remove locally
    const toDeleteIds = todos.filter((t) => t.selected).map((t) => t.id);
    const updated = todos.filter((t) => !t.selected);
    setTodos(updated);
    toast.warn(`Removed ${toDeleteIds.length}`);
    trackEvent("BulkDelete", {
      ids: toDeleteIds,
      count: toDeleteIds.length,
      userType: user?.isAnonymous ? "anonymous" : "authenticated",
    });

    // Persist to Firestore
    if (user && !user.isAnonymous) {
      const ref = doc(db, "todos", user.uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : {};
      await setDoc(
        ref,
        {
          items: updated,
          archived: data.archived || [],
        },
        { merge: true }
      );
      toast.success("Removed selected tasks in Cloud");
      trackEvent("CloudBulkDelete", { ids: toDeleteIds });
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const arr = [...todos];
    [arr[index - 1], arr[index]] = [arr[index], arr[index - 1]];
    setTodos(arr);
    trackEvent("Reorder", {
      direction: "up",
      id: arr[index].id,
      userType: user?.isAnonymous ? "anonymous" : "authenticated",
    });
  };

  const moveDown = (index) => {
    if (index === todos.length - 1) return;
    const arr = [...todos];
    [arr[index], arr[index + 1]] = [arr[index + 1], arr[index]];
    setTodos(arr);
    trackEvent("Reorder", {
      direction: "down",
      id: arr[index].id,
      userType: user?.isAnonymous ? "anonymous" : "authenticated",
    });
  };

  const clearCompleted = async () => {
    const completedTasks = todos.filter((t) => t.completed);
    const remaining = todos.filter((t) => !t.completed);

    setTodos(remaining);
    toast.info("Cleared completed");
    trackEvent("ClearedCompleted", {
      count: completedTasks.length,
      userType: user?.isAnonymous ? "anonymous" : "authenticated",
    });

    if (user && !user.isAnonymous) {
      const ref = doc(db, "todos", user.uid);
      const snap = await getDoc(ref);
      const data = snap.exists() ? snap.data() : { items: [], archived: [] };

      // merge new archived tasks
      const updatedArchived = [...(data.archived || []), ...completedTasks];

      await setDoc(
        ref,
        {
          items: remaining,
          archived: updatedArchived,
        },
        { merge: true }
      );
      toast.success("Archived completed tasks to Cloud");
      trackEvent("CloudArchive", { count: completedTasks.length });
    }
  };

  const clearCache = () => {
    localStorage.clear();
    setTodos([]);
    toast.info("Cleared all");
    trackEvent("CacheCleared", {
      userType: user?.isAnonymous ? "anonymous" : "authenticated",
    });
  };

  const anySelected = todos.some((t) => t.selected);
  const anyCompleted = todos.some((t) => t.completed);

  return (
    <div className="min-h-screen bg-gray-50">
      <SignUp
        user={user}
        onLogin={handleLogin}
        onSignOut={handleSignOut}
        onUpload={handleUpload}
      />

      <div className="max-w-4xl mx-auto p-6 pt-20">
        <h1 className="text-2xl font-semibold mb-4">Tasks Tracker</h1>
        <p className="text-gray-600 mb-6">
          Stay organized with tasks, your way.
        </p>

        <div className="bg-white rounded-md shadow-sm border border-gray-200 mb-6">
          <ul className="flex space-x-6 px-4 py-3 text-sm text-gray-700">
            <li
              onClick={() => {
                setActiveTab("all");
                trackEvent("Tab Changed", { tab: "all" });
              }}
              className={`cursor-pointer ${
                activeTab === "all"
                  ? "font-medium border-b-2 border-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              All Tasks
            </li>
            <li
              onClick={() => {
                setActiveTab("archived");
                trackEvent("Tab Changed", { tab: "archived" });
              }}
              className={`cursor-pointer ${
                activeTab === "archived"
                  ? "font-medium border-b-2 border-black"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              Archived
            </li>
          </ul>
        </div>

        {/* Add form */}
        <div className="flex gap-2 mb-4">
          <input
            className="flex-1 border border-gray-300 rounded px-3 py-2 focus:border-black focus:ring-0"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Task name"
          />
          <input
            className="w-32 border border-gray-300 rounded px-2 py-2 focus:border-black focus:ring-0"
            type="text"
            value={labelInput}
            onChange={(e) => setLabelInput(e.target.value)}
            placeholder="Label"
          />
          <button
            onClick={addTodo}
            className="bg-black text-white px-4 rounded"
          >
            Add Task
          </button>
        </div>

        {/* Bulk actions */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={bulkDelete}
            disabled={!anySelected}
            className={`px-3 py-2 rounded border ${
              anySelected
                ? "border-red-500 text-red-500 hover:bg-red-50"
                : "border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Delete Selected
          </button>
          <button
            onClick={clearCompleted}
            disabled={!anyCompleted}
            className={`px-3 py-2 rounded border ${
              anyCompleted
                ? "border-yellow-500 text-yellow-500 hover:bg-yellow-50"
                : "border-gray-200 text-gray-400 cursor-not-allowed"
            }`}
          >
            Archive Completed
          </button>
          <button
            onClick={clearCache}
            className="px-3 py-2 rounded border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Clear All
          </button>
        </div>

        {/* Tasks table */}
        <div className="bg-white rounded-md shadow-sm border border-gray-200 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2">Select</th>
                <th className="px-4 py-2">Task name</th>
                <th className="px-4 py-2">Status</th>
                <th className="px-4 py-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {todos.map((t, i) => (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={t.selected}
                      onChange={() => toggleSelect(t.id)}
                      className="h-4 w-4 text-indigo-600"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        t.completed ? "line-through text-gray-500" : ""
                      }
                    >
                      {t.text}
                    </span>
                    {t.label && (
                      <span className="ml-2 text-xs bg-gray-200 text-gray-700 px-1 rounded">
                        {t.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-700">
                    {t.completed ? "Done" : "Open"}
                  </td>
                  <td className="px-4 py-3 flex space-x-2">
                    <button
                      onClick={() => moveUp(i)}
                      disabled={i === 0}
                      className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveDown(i)}
                      disabled={i === todos.length - 1}
                      className="text-gray-500 hover:text-gray-700 disabled:text-gray-300"
                    >
                      ↓
                    </button>
                    <button
                      onClick={() => toggleComplete(t.id)}
                      className="text-blue-600 hover:underline"
                    >
                      {t.completed ? "Undo" : "Done"}
                    </button>
                    <button
                      onClick={() => deleteTodo(t.id)}
                      className="text-red-600 hover:underline"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!todos.length && (
                <tr>
                  <td
                    colSpan="3"
                    className="px-4 py-6 text-center text-gray-500"
                  >
                    No tasks yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

export default App;
