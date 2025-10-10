// src/api/axios.js
import axios from "axios";

/**
 * Centralized axios instance:
 * - baseURL from REACT_APP_API_BASE (fallback localhost:5000)
 * - withCredentials so session cookies work
 * - JSON headers by default
 */
const instance = axios.create({
  baseURL: process.env.REACT_APP_API_BASE || "http://localhost:5000",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

export default instance;
