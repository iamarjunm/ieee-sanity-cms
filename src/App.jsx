import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "./firebase";
import { useState, useEffect } from "react";

import Home from "./pages/Home";
import Login from "./pages/Login";
import AddEvent from "./pages/AddEvent";
import EditEvent from "./pages/EditEvent";
import AddTeam from "./pages/AddTeam";
import EditTeam from "./pages/EditTeam";
import { Toaster } from 'react-hot-toast';

const ProtectedRoute = ({ element }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return user ? element : <Navigate to="/login" />;
};

const App = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<ProtectedRoute element={<Home />} />} />
        <Route path="/add-event" element={<ProtectedRoute element={<AddEvent />} />} />
        <Route path="/edit-event/:id" element={<ProtectedRoute element={<EditEvent />} />} />
        <Route path="/add-team" element={<ProtectedRoute element={<AddTeam />} />} />
        <Route path="/edit-team/:id" element={<ProtectedRoute element={<EditTeam />} />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
      <Toaster position="bottom-right" />
    </Router>
  );
};

export default App;
