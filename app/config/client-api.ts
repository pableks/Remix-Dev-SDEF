import axios from "axios";

// Client-side API configuration - uses proxied endpoints through Caddy
export const ClientAPI = axios.create({
  baseURL: "/api", // This will be proxied to the backend by Caddy
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// For incident-related API calls
export const IncidentAPI = axios.create({
  baseURL: "/incendios", // This will be proxied to port 8100 by Caddy
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
});

// Helper function to determine if we're on client or server
const isClient = typeof window !== "undefined";

// Main API configuration - uses different base URLs for client vs server
export const API = axios.create({
  baseURL: isClient ? "/api" : (process.env.BACKEND_URL || "http://localhost:8000"),
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    Accept: "application/json",
  },
}); 