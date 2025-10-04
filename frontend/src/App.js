// src/App.js
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import "./App.css";

/* ----------- Shared layout ----------- */
import Header from "./HeaderFotter/Header";
import Footer from "./HeaderFotter/Footer";

/* ----------- User-facing (root home) ----------- */
import MainHome from "./Components/Home/home";

/* ----------- Admin pages ----------- */
import AdminHome from "./Components/Admins/AdminHome";
import AdminAlert from "./Components/AlertFolder/AdminAlert";
import AlertAdd from "./Components/AlertFolder/AlertAdd";
import UpdateAlert from "./Components/AlertFolder/UpdateAlert";
import AdminRegitration from "./Components/Admins/AdminRegitration";
import AdminLogin from "./Components/Admins/AdminLogin";
import AdminProfile from "./Components/Admins/AdminProfile";

/* ----------- User features ----------- */
import UserAlerts from "./Components/UserAlertFolder/UserAlerts";
import Registration from "./Components/UserRegFolder/Registation";
import UserLogin from "./Components/UserLoginFolder/UserLogin";
import EmailVerify from "./Components/EmailVerify/Everify";
import UserProfile from "./Components/UserRegFolder/UserProfile";

/* ----------- Map / Contact / Simple dashboard ----------- */
import MapComponent from "./Components/map/map";
import UserMap from "./Components/map/UserMap";
import PinDetails from "./Components/map/PinDetails";
import ContactForm from "./Components/Conatct/ContactForm";   // note: 'Conatct'
import ContactList from "./Components/Conatct/ContactList";
import SimpleDashboard from "./Components/Dashboard/SimpleDashboard";

/* ----------- Victim Dashboard ----------- */
import Dashboard from "./Component/VictimDashboard/Dashboard"; // note: 'Component'
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
import DMODashboard from "./Components/DMODashboard/DMODashboard";
import ResponseDashboard from "./Components/ResponseDashboard/ResponseDashboard";
import Deployments from "./Components/DMODashboard/Reports/Deployments";


export default function App() {
  return (
    <>
      <Header />
      <Routes>
        {/* Root home */}
        <Route path="/" element={<MainHome />} />

        {/* Old /Home links → redirect to root */}
        <Route path="/Home" element={<Navigate to="/" replace />} />

        {/* User routes */}
        <Route path="/UserAlerts" element={<UserAlerts />} />
        <Route path="/Registration" element={<Registration />} />
        <Route path="/UserLogin" element={<UserLogin />} />
        <Route path="/users/:id/verify/:token" element={<EmailVerify />} />
        <Route path="/UserProfile" element={<UserProfile />} />

        {/* Admin auth */}
        <Route path="/AdminLogin" element={<AdminLogin />} />

        {/* Admin dashboard (nested) */}
        <Route path="/AdminHome" element={<AdminHome />}>
          <Route index element={<AdminAlert />} />
          <Route path="toAlerts" element={<AdminAlert />} />
          <Route path="alerts/:severity" element={<AdminAlert />} />
          <Route path="AlertAdd" element={<AlertAdd />} />
          <Route path="UpdateAlert/:id" element={<UpdateAlert />} />
          <Route path="AdminRegitration" element={<AdminRegitration />} />
          <Route path="AdminProfile" element={<AdminProfile />} />
        </Route>

        {/* Map / Contact / Simple dashboard */}
        <Route path="/admin-dashboard" element={<SimpleDashboard />} />
        <Route path="/map" element={<MapComponent />} />
        <Route path="/user-map" element={<UserMap />} />
        <Route path="/pin-details/:id" element={<PinDetails />} />
        <Route path="/pin/:id" element={<PinDetails />} />
        <Route path="/contact" element={<ContactForm />} />
        <Route path="/contact-list" element={<ContactList />} />

        {/* Victim Dashboard */}
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

        {/* Fallback → root */}
        <Route path="*" element={<Navigate to="/" replace />} />
        {/* DMO and Response Dashboard Routes */}
        <Route path="/dmo" element={<DMODashboard />} />
        <Route path="/deployments" element={<Deployments />} />
        <Route path="/response" element={<ResponseDashboard />} />
      </Routes>
      <Footer />
    </>
  );
}
