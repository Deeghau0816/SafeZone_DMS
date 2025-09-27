import "./App.css";

import React from "react";

import { Route, Routes } from "react-router-dom";

import MapComponent from "./Components/map/map";

import UserMap from "./Components/map/UserMap";

import PinDetails from "./Components/map/PinDetails";

import ContactForm from "./Components/Conatct/ContactForm";

import ContactList from "./Components/Conatct/ContactList";

import Home from "./Components/Home/home";

import SimpleDashboard from "./Components/Dashboard/SimpleDashboard";

function App() {
  return (
    <div>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/dashboard" element={<SimpleDashboard />} />
        <Route path="/map" element={<MapComponent />} />
        <Route path="/user-map" element={<UserMap />} />
        <Route path="/pin-details/:id" element={<PinDetails />} />
        <Route path="/pin/:id" element={<PinDetails />} /> 
        <Route path="/contact" element={<ContactForm />} />
        <Route path="/contact-list" element={<ContactList />} />
      </Routes>
    </div>
  );
}

export default App;
