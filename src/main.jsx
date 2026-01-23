import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("Root element (#root) not found");

ReactDOM.createRoot(rootElement).render(
  // Keep StrictMode ON for dev (it helps catch bugs),
  // but be aware it double-invokes effects in development.
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
