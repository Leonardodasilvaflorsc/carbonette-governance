import type { Metadata } from "next";
import "./globals.css";

const appName = process.env.NEXT_PUBLIC_APP_NAME ?? "ORBITAL-GHG";

export const metadata: Metadata = {
  title: appName,
  description: "Inteligência de emissões de gases de efeito estufa via satélite",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body className="bg-background text-text-primary antialiased">{children}</body>
    </html>
  );
}
