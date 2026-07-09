"use client";

import dynamic from "next/dynamic";
import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const SharedView = dynamic(() => import("@/components/share/SharedView"), { ssr: false });

export default function SharePage({ params }: { params: { token: string } }) {
  const [client] = useState(() => new QueryClient());
  return (
    <QueryClientProvider client={client}>
      <SharedView token={params.token} />
    </QueryClientProvider>
  );
}
