import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { GoogleOAuthProvider } from "@react-oauth/google";
import Providers from "./app/providers";
import App from "./app/App";
import "./styles/globals.css";
import { applyTheme, APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS } from "./hooks/useAppSettings";
import { readJSON } from "./hooks/useLocalStorage";

const GOOGLE_CLIENT_ID =
  import.meta.env.VITE_GOOGLE_CLIENT_ID ||
  import.meta.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  "";

const initialSettings = readJSON(APP_SETTINGS_KEY, DEFAULT_APP_SETTINGS);
applyTheme(initialSettings?.theme || "light");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <Providers>
          <App />
        </Providers>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
