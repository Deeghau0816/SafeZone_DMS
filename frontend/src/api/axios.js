// src/api/axios.js
import axios from "axios";

const api = axios.create({
  baseURL: "http://localhost:5000",   // <-- your Node API
  withCredentials: true,              // send/receive session cookie
  headers: { "Content-Type": "application/json" },
});

// (optional) log API errors to console for quick debugging
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const s = err?.response?.status;
    const d = err?.response?.data;
    console.error("[API]", s, d || err.message);
    return Promise.reject(err);
  }
);

export default api;
