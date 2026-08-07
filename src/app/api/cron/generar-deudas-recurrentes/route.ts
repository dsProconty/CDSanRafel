import { NextResponse } from "next/server";

import { generarPendientesGlobal } from "@/lib/deuda-recurrente";

// Corre una vez al día (ver vercel.json). Genera el período que corresponda
// para cada plan de deuda recurrente activo cuya próxima fecha ya llegó.
export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "CRON_SECRET no configurado en el proyecto." },
      { status: 500 }
    );
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const generadas = await generarPendientesGlobal();
  return NextResponse.json({ generadas: generadas.length, detalle: generadas });
}
