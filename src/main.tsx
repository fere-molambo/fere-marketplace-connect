/**
 * FERE Application Entry Point
 * Main entry file for the React application
 * 
 * @mobile This file initializes the web app. Mobile apps should use their own entry points.
 */
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
