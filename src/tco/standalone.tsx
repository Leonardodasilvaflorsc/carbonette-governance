/**
 * Entrada autônoma do AHS TCO Fleet.
 *
 * Monta apenas o simulador, sem roteador, autenticação ou Supabase, para gerar
 * uma página única distribuível. O build correspondente é `npm run build:tco`.
 */
import { createRoot } from "react-dom/client";
import TcoFleet from "@/pages/TcoFleet";
import "@/index.css";

createRoot(document.getElementById("root")!).render(<TcoFleet />);
