import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";

// Force rebuild - v5 - 2024-12-05 - Debug blank page
console.log("🚀 Fere App v5 - Starting initialization...");

try {
  const rootElement = document.getElementById("root");
  console.log("📍 Root element found:", !!rootElement);
  
  if (!rootElement) {
    throw new Error("Root element not found");
  }
  
  const root = createRoot(rootElement);
  console.log("✅ React root created");
  
  root.render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  
  console.log("✅ App rendered successfully");
} catch (error) {
  console.error("❌ Fatal error during initialization:", error);
  // Show error in the DOM as fallback
  const rootElement = document.getElementById("root");
  if (rootElement) {
    rootElement.innerHTML = `
      <div style="padding: 20px; font-family: sans-serif;">
        <h1 style="color: red;">Erreur de chargement</h1>
        <pre style="background: #f0f0f0; padding: 10px; overflow: auto;">${error}</pre>
      </div>
    `;
  }
}
