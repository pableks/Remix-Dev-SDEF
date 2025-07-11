import axios from "axios";

export const API = axios.create({
  baseURL: process.env.BACKEND_URL || "http://localhost:8000",
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
}); 