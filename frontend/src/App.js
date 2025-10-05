import "./App.css";

import React from "react";

import { Route, Routes, Navigate } from "react-router-dom";

//  Existing Component
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
// Donation Dashboard Components
import DashboardLayout from "./Component/DonationDashboard/DashboardLayout";
import Overview from "./Component/DonationDashboard/Overview";
import DonationsPanel from "./Component/DonationDashboard/DonationsPanel";
import ActiveDisasterPanel from "./Component/DonationDashboard/active";
import InventoryPanel from "./Component/DonationDashboard/InventoryPanel";
import CentersPanel from "./Component/DonationDashboard/CentersPanel";
import VolunteersPanel from "./Component/DonationDashboard/VolunteersPanel";
import DistributionPanel from "./Component/DonationDashboard/DistributionPanel";
import TopDonorsPage from "./Component/DonationDashboard/TopDonorsPage";
import Operation from "./Component/DonationDashboard/Operation";
import EditVolunteerPage from "./Component/DonationDashboard/EditVolunteerPage";
import DonationEditPage from "./Component/DonationDashboard/DonationEditPage";
import EditCenter from "./Component/DonationDashboard/EditCenter";
import DistributionQuantityChart from './Component/DonationDashboard/distributionquantitychart';
import TargetInventory from "./Component/DonationDashboard/targetinventory";
import Ngopast from "./Component/DonationDashboard/ngopast";

// Public Donation Components
import Donation from "./Component/Donation/Donationwebpage/Donation";
import DistributionPlan from "./Component/Donation/Donate_distributionplan/Distributionplan";
import Donationform from "./Component/Donation/Donatemoney/Donationform";
import Ngodisaster from "./Component/Donation/Donate_activedisasters/Ngodisaster";
import Centers from "./Component/Donation/donate_centers/centers";
import Volunteer from "./Component/Donation/Donation_volunteer/Volunteer";
import DonateItemForm from "./Component/Donation/Donaterelief/donateitemform";


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

        {/* Donation Dashboard Routes */}
        <Route path="/donation-dashboard" element={<DashboardLayout />}>
          {/* Default dashboard page */}
          <Route index element={<Overview />} />
          <Route path="overview" element={<Overview />} />

          {/* Donations */}
          <Route path="donations" element={<DonationsPanel />} />
          <Route path="donations/top" element={<TopDonorsPage />} />
          <Route path="donations/:id/edit" element={<DonationEditPage />} />

          {/* Disasters */}
          <Route path="disasters" element={<Navigate to="disasters/active" replace />} />
          <Route path="disasters/active" element={<ActiveDisasterPanel />} />

          {/* Inventory & Centers */}
          <Route path="inventory" element={<InventoryPanel />} />
          <Route path="centers" element={<CentersPanel />} />
          <Route path="centers/:id/edit" element={<EditCenter />} />

          {/* Volunteers */}
          <Route path="volunteers" element={<VolunteersPanel />} />
          <Route path="volunteers/:id/edit" element={<EditVolunteerPage />} />

          {/* Distribution */}
          <Route path="distribution" element={<DistributionPanel />} />

          {/* Operations */}
          <Route path="operations" element={<Operation />} />
          <Route path="ngopast" element={<Ngopast />} />
        </Route>

        {/* Standalone Donation Dashboard Routes */}
        <Route path="/dashboard/target-inventory" element={<TargetInventory />} />
        <Route path="/distributionquantitychart" element={<DistributionQuantityChart />} />

        {/* Public Donation Routes */}
        <Route path="/donation" element={<Donation />} />
        <Route path="/donation/new" element={<Donationform />} />
        <Route path="/donation/disasters/admin" element={<Ngodisaster />} />
        <Route path="/donateitemform" element={<DonateItemForm />} />
        <Route path="/distribution" element={<DistributionPlan />} />
        <Route path="/centers" element={<Centers />} />
        <Route path="/volunteers" element={<Volunteer />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;