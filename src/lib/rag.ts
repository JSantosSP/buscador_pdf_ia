export async function askWithContext(query: string, results: any[], summary?: string | null) {
  const context = results.map(r => r.content).join("\n---\n");

  let prompt = `
Eres un asistente experto que analiza documentos y responde preguntas basándote en el contexto proporcionado.

INSTRUCCIONES PRINCIPALES:
1. Responde únicamente basándote en la información del contexto y resumen proporcionados
2. Puedes hacer deducciones lógicas razonables basadas en la información disponible
3. Si no hay información suficiente para responder o hacer deducciones válidas, responde: "No encontré suficiente información en el documento para responder esta pregunta"

CAPACIDADES DE DEDUCCIÓN:
- Si encuentras el nombre de un proyecto y una persona asociada como responsable/creador, puedes deducir que esa persona es el autor
- Si hay fechas, ubicaciones o contextos relacionados, puedes conectar información dispersa
- Si hay referencias cruzadas (ej: "como se mencionó anteriormente"), puedes inferir conexiones
- Puedes deducir roles, responsabilidades o relaciones basándote en el contexto profesional
- Si hay patrones consistentes en el documento, puedes extrapolar información similar

EJEMPLOS DE DEDUCCIONES VÁLIDAS:
- "Aunque no se menciona explícitamente 'autor', basándome en que Juan Pérez aparece como creador del proyecto y responsable principal, puedo deducir que es el autor del documento"
- "Si bien no hay una fecha exacta, las referencias a eventos de 2023 sugieren que el documento fue creado en ese período"
- "Aunque no se especifica directamente, el contexto de las responsabilidades mencionadas indica que se trata de un rol de gestión"

FORMATO DE RESPUESTA:
- Proporciona la respuesta directa
- Si haces deducciones, explica brevemente tu razonamiento usando frases como: "Basándome en...", "Puedo deducir que...", "El contexto sugiere que..."
- Distingue entre información explícita e inferida
`;

  // Si hay resumen, añadirlo al prompt
  if (summary) {
    prompt += `

RESUMEN DEL DOCUMENTO COMPLETO:
${summary}

Este resumen te ayuda a entender el contexto general y hacer mejores conexiones entre la información específica.

---
`;
  }

  prompt += `
CONTEXTO ESPECÍFICO (fragmentos relevantes):
${context}

PREGUNTA: ${query}

ANÁLISIS Y RESPUESTA:
`;

  const response = await fetch("http://localhost:11434/api/generate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ 
      model: "gemma", 
      prompt,
      options: {
        temperature: 0.3,  // Menos creatividad, más precisión en deducciones
        top_p: 0.8,
        repeat_penalty: 1.1
      }
    }),
  });

  const reader = response.body?.getReader();
  let result = "";

  if (reader) {
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      try {
        const json = JSON.parse(chunk);
        result += json.response || "";
      } catch {
        // Ollama devuelve JSON por streaming, aquí vamos concatenando
      }
    }
  }

  return result.trim();
}