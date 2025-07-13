// src/utils/ModelConnector.ts
export async function queryOllama(model: string, prompt: string): Promise<string> {
  const res = await fetch('http://localhost:11434/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
    }),
  });

  if (!res.ok) {
    throw new Error(`Ollama error: ${res.statusText}`);
  }

  const data = await res.json();
  return data.response;
}
