// utils/wandboxService.ts

export interface WandboxPayload {
  code: string;
  compiler: string;
  stdin?: string;
  options?: string;
}

export interface WandboxResponse {
  compiler_error?: string;
  program_error?: string;
  program_output?: string;
  status?: string;
}

export async function compileCppCode(code: string, stdin: string = "3"): Promise<WandboxResponse> {
 
  const response = await fetch("/api/compiler", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      stdin: stdin || ""
    })
  });

  if (!response.ok) {
    throw new Error("Serverlə əlaqə qurularkən xəta baş verdi.");
  }

  return response.json();
}