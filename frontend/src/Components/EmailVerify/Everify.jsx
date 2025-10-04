import { useEffect, useState, Fragment } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import success from "../images/success.png";
import "./Everify.css";

const Everify = () => {
  const [status, setStatus] = useState("loading"); // "loading" | "success" | "error"
  const { id, token } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    let timer;
    const verifyEmailUrl = async () => {
      try {
        const url = `http://localhost:5000/users/${id}/verify/${token}`;
        const { data } = await axios.get(url);
        console.log("✅ Verification response:", data);

        setStatus("success");

        // redirect after 3 sec
        timer = setTimeout(() => navigate("/UserLogin"), 3000);
      } catch (error) {
        console.error("Verification error:", error);
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
