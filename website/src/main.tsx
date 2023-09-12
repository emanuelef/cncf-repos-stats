import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { ProSidebarProvider } from "react-pro-sidebar";
const root = ReactDOM.createRoot(document.getElementById("root"));
import { BrowserRouter } from "react-router-dom";
root.render(
  <React.StrictMode>
    <div>
      <ProSidebarProvider>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </ProSidebarProvider>
    </div>
  </React.StrictMode>
);
