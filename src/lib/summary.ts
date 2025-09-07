export async function generateSummary(textContent: string): Promise<string> {
  try {
    // Limitar el texto si es muy largo (Ollama tiene límites de contexto)
    const maxLength = 8000; // Ajusta según tu modelo
    const truncatedText = textContent.length > maxLength 
      ? textContent.substring(0, maxLength) + "..."
      : textContent;

    const prompt = `
Por favor, genera un resumen completo y estructurado del siguiente documento.
El resumen debe incluir:
1. Tema principal del documento
2. Puntos clave más importantes
3. Conclusiones principales
4. Cualquier información relevante destacable

Texto del documento:
${truncatedText}

Resumen:
`;

    const response = await fetch("http://localhost:11434/api/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        model: "gemma", 
        prompt,
        stream: false // Desactivar streaming para obtener respuesta completa
      }),
    });

    if (!response.ok) {
      throw new Error(`Error en Ollama API: ${response.statusText}`);
    }

    const data = await response.json();
    return data.response || "No se pudo generar el resumen";

  } catch (error) {
    console.error('Error generando resumen:', error);
    throw new Error('Error al generar resumen con Ollama');
  }
}