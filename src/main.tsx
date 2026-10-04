// 应用入口统一装配缓存与轻提示。

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { queryClient } from "./lib/queryClient";
import { Router } from "./router";
import "./index.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
