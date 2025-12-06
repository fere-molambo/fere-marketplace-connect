// Force clean rebuild - 2025-12-06 v1
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

console.log("App initialized:", Date.now());
createRoot(document.getElementById("root")!).render(<App />);
