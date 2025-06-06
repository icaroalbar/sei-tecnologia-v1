// Esta função deve estar definida no mesmo arquivo do handler ou ser importada.
function formatInternalJson(inputArray) {
  // Validação da entrada: deve ser um array com pelo menos um elemento.
  if (!Array.isArray(inputArray) || inputArray.length === 0) {
    throw new Error(
      "Entrada para formatInternalJson deve ser um array não vazio."
    );
  }

  // Pega o primeiro elemento, que se espera ser um objeto com a propriedade 'text'.
  const firstElement = inputArray[0];
  if (
    typeof firstElement !== "object" ||
    firstElement === null ||
    typeof firstElement.text !== "string"
  ) {
    throw new Error(
      "O primeiro elemento do array de entrada deve ser um objeto com uma propriedade 'text' (string)."
    );
  }

  const textContent = firstElement.text;

  // Encontra o início do conteúdo JSON (o primeiro '{').
  const jsonStartIndex = textContent.indexOf("{");
  if (jsonStartIndex === -1) {
    throw new Error(
      "Não foi possível encontrar o início do JSON (caractere '{') no texto extraído."
    );
  }

  // Extrai a substring que deveria ser o JSON.
  // Isso assume que o bloco JSON é a última parte principal da string.
  // Se houver texto *após* um bloco JSON válido dentro de `textContent`, JSON.parse falhará.
  const potentialJsonString = textContent.substring(jsonStartIndex);

  try {
    // Converte a string extraída para um objeto JavaScript.
    const jsonObject = JSON.parse(potentialJsonString);

    // Converte o objeto JavaScript de volta para uma string JSON formatada (2 espaços para indentação).
    const formattedJsonString = JSON.stringify(jsonObject, null, 2);
    return formattedJsonString;
  } catch (error) {
    // Se a conversão falhar, significa que a string extraída não era um JSON válido.
    console.error("Falha ao parsear o JSON interno:", potentialJsonString);
    throw new Error(
      `Erro ao converter o texto extraído para JSON: ${error.message}`
    );
  }
}
