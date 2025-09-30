import "./App.css";

import React from "react";

import { Route, Routes } from "react-router-dom";

// Existing Components
import MapComponent from "./Components/map/map";
import UserMap from "./Components/map/UserMap";
import PinDetails from "./Components/map/PinDetails";
import ContactForm from "./Components/Conatct/ContactForm";
import ContactList from "./Components/Conatct/ContactList";
import Home from "./Components/Home/home";
import SimpleDashboard from "./Components/Dashboard/SimpleDashboard";
import Header from "./HeaderFotter/Header";
import Footer from "./HeaderFotter/Footer";

// Victim Dashboard Components
import Dashboard from "./Component/VictimDashboard/Dashboard";
import Report from "./Component/VictimDashboard/ReportDisaster/Report";
import ReadReport from "./Component/VictimDashboard/ReportDisaster/ReadReport";
import EditReport from "./Component/VictimDashboard/ReportDisaster/EditReport";
import VictimProfile from "./Component/VictimDashboard/VictimProfile/VictimProfile";
import EditVictimProfile from "./Component/VictimDashboard/VictimProfile/EditVictimProfile";
import RequestAid from "./Component/VictimDashboard/RequestAid/RequestAid";
import ReadAid from "./Component/VictimDashboard/RequestAid/Read";
import Claim from "./Component/VictimDashboard/DisasterClaim/Claim";
import ReadClaim from "./Component/VictimDashboard/DisasterClaim/Read";
import ReportsHub from "./Component/VictimDashboard/ReportsHub/ReportsHub";
import Records from "./Component/VictimDashboard/Records/Records";


function App() {
  return (
    <div>
      <Header />
      <Routes>
        {/* Main Application Routes */}
        <Route path="/" element={<Home />} />
        <Route path="/admin-dashboard" element={<SimpleDashboard />} />
        <Route path="/map" element={<MapComponent />} />
        <Route path="/user-map" element={<UserMap />} />
        <Route path="/pin-details/:id" element={<PinDetails />} />
        <Route path="/pin/:id" element={<PinDetails />} /> 
        <Route path="/contact" element={<ContactForm />} />
        <Route path="/contact-list" element={<ContactList />} />

        {/* Victim Dashboard Routes */}
        <Route path="/victim" element={<Dashboard />} />
        <Route path="/victim/dashboard" element={<Dashboard />} />
        <Route path="/victim/report" element={<Report />} />
        <Route path="/victim/read" element={<ReadReport />} />
        <Route path="/victim/report/:id/edit" element={<EditReport />} />
        <Route path="/victim/profile/:id" element={<VictimProfile />} />
        <Route path="/victim/profile/:id/edit" element={<EditVictimProfile />} />
        <Route path="/victim/aid" element={<RequestAid />} />
        <Route path="/victim/aid/records" element={<ReadAid />} />
        <Route path="/victim/claim" element={<Claim />} />
        <Route path="/victim/claim/records" element={<ReadClaim />} />
        <Route path="/victim/reports" element={<ReportsHub />} />
        <Route path="/victim/records" element={<Records />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
