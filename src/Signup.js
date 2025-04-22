// src/SignUp.js
import React, { useState, useRef, useEffect } from "react";
import userIcon from "./assets/user.svg";
import googleLogo from "./assets/google_logo.svg";
// import cloudIcon from "./assets/google_cloud.svg";

const SignUp = ({ user, onLogin, onSignOut, onUpload }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  return (
    <nav className="w-full bg-white shadow fixed top-0 left-0 z-50">
      <div className="max-w-4xl mx-auto flex items-center h-16 px-4">
        {/* Brand / Title */}
        <div className="text-lg font-semibold">Tasks Tracker</div>

        {/* Spacer */}
        <div className="flex-grow" />

        {/* User menu */}
        <div className="relative" ref={ref}>
          <button
            onClick={() => setOpen((o) => !o)}
            className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center focus:outline-none"
          >
            <img src={userIcon} alt="User menu" className="w-6 h-6" />
          </button>

          {open && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 p-4 space-y-2">
              {user?.isAnonymous ? (
                <button
                  onClick={onLogin}
                  className="flex items-center w-full px-3 py-2 hover:bg-gray-100 rounded"
                >
                  <span>Continue with</span>
                  <img
                    src={googleLogo}
                    alt="Google"
                    className="w-12 h-6 ml-2"
                  />
                </button>
              ) : (
                <button
                  onClick={onSignOut}
                  className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded"
                >
                  Sign Out
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default SignUp;
