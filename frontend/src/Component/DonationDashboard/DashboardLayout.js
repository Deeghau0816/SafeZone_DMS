import React from "react";
import { Outlet } from "react-router-dom";
import DonationSidebar from "./DonationSidebar";
import "./donationcss/DashboardLayout.css";

export default function DashboardLayout() {
  return (
    <div className="dashboard-layout">
      <DonationSidebar />
      <div className="dashboard-content">
        <main className="dashboard-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
