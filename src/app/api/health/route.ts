export async function GET() {
  return Response.json({
    ok: true,
    service: "aurea",
    status: "dev",
    version: "0.1.0",
  });
}