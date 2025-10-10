import { useEffect, useState, Fragment } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import success from "../images/success.png";
import "./Everify.css";

function getApiBase() {
  // Vite first, then CRA, then a safe fallback using the current host on port 5000
  const vite = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.VITE_API_URL;
  const cra  = typeof process !== "undefined" && process.env && process.env.REACT_APP_API_URL;

  // If neither env is set, build http://<current-host>:5000
  const fallback = `${window.location.protocol}//${window.location.hostname}:5000`;

  return (vite || cra || fallback).replace(/\/+$/, "");
}

const Everify = () => {
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const { id, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;

    const verifyEmailUrl = async () => {
      try {
        if (!id || !token) {
          setStatus("error");
          return;
        }

        const apiBase = getApiBase();
        const url = `${apiBase}/users/${id}/verify/${token}`;

        // withCredentials in case your API uses cookie sessions
        const res = await axios.get(url, { withCredentials: true, timeout: 15000 });

        // Treat any 2xx (and even 3xx followed by axios auto-follow) as success
        if (res && res.status >= 200 && res.status < 400) {
          console.log("✅ Verification response:", res.data);
          setStatus("success");
          // redirect after a short delay
          timer = setTimeout(() => navigate("/UserLogin"), 1500);
        } else {
          console.warn("Unexpected verification status:", res?.status);
          setStatus("error");
        }
      } catch (error) {
        console.error("Verification error:", error?.response?.data || error.message);
        setStatus("error");
      }
    };

    verifyEmailUrl();
    return () => clearTimeout(timer);
  }, [id, token, navigate]);

  return (
    <Fragment>
      {status === "loading" && (
        <div className="container">
          <h1>Verifying your email…</h1>
          <p>Please wait a moment.</p>
        </div>
      )}

      {status === "success" && (
        <div className="container">
          <img src={success} alt="success_img" className="success_img" />
          <h1>Email verified successfully</h1>
          <p>You will be redirected to login shortly…</p>
          <Link to="/UserLogin">
            <button className="green_btn">Go to Login</button>
          </Link>
        </div>
      )}

      {status === "error" && (
        <div className="container">
          <h1>Verification link is invalid or expired</h1>
          <p>Please request a new verification email.</p>
          <button className="outline_btn" onClick={() => navigate("/")}>
            Go to Home
          </button>
        </div>
      )}
    </Fragment>
  );
};

export default Everify;
