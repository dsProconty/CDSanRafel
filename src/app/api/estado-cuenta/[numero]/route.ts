import { NextResponse } from "next/server";

import { auth } from "@/auth";
import { obtenerDatosEstadoCuenta } from "@/lib/estado-cuenta-datos";
import { renderEstadoCuentaPdf } from "@/lib/estado-cuenta-pdf";

// PDF de estado de cuenta de una casa, descargable tanto por el admin
// (desde /casas) como por el propio propietario (desde su dashboard) —
// se genera al vuelo con la data actual, no se archiva en Blob como los
// informes mensuales.
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ numero: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "No autorizado." }, { status: 401 });
  }

  const { numero } = await params;
  const datos = await obtenerDatosEstadoCuenta(numero);
  if (!datos) {
    return NextResponse.json({ error: "Casa no encontrada." }, { status: 404 });
  }

  const esAdmin = session.user.rol === "admin";
  const esTitular = datos.casa.usuarioId === Number(session.user.id);
  if (!esAdmin && !esTitular) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  const buffer = await renderEstadoCuentaPdf(datos);

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="estado-cuenta-casa-${datos.casa.numero}.pdf"`,
    },
  });
}
