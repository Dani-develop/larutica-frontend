import { runMailDiagnostic } from "@/lib/mail/diagnostic";

export async function POST(request: Request) {
  return runMailDiagnostic(request);
}
