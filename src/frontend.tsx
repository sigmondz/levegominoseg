import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { UploadPage } from "./UploadPage";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import "./index.css";

const root = document.getElementById("root");
if (!root) {
  throw new Error("Missing #root element");
}

const path = window.location.pathname.replace(/\/+$/, "") || "/";
const isDev = Boolean(import.meta.hot);
const showUpload = path === "/feltoltes" && isDev;

if (path === "/feltoltes" && !isDev) {
  window.location.replace("/");
} else {
  createRoot(root).render(
    <StrictMode>{showUpload ? <UploadPage /> : <App />}</StrictMode>,
  );
  if (!showUpload) {
    registerServiceWorker();
  }
}

if (import.meta.hot) {
  import.meta.hot.accept();
}
