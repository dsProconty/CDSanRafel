import { redirect } from "next/navigation";

// Se unificó con /deudas/masiva (selector "Aplicación única" / "Recurrente").
export default function DeudasRecurrentesPage() {
  redirect("/deudas/masiva");
}
