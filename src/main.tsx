// 应用入口统一装配缓存与轻提示。

import { QueryClientProvider } from "@tanstack/react-query";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Toaster } from "sonner";
import { Card } from "./components/ui";
import { queryClient } from "./lib/queryClient";
import "./index.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <main className="workspace">
        <Card>
          <h1>四系点工 · 管理后台</h1>
          <p>工程基础设施已就绪</p>
        </Card>
      </main>
      <Toaster richColors position="top-right" />
    </QueryClientProvider>
  </StrictMode>,
);
