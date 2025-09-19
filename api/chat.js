import categories from "../categories.json" assert { type: "json" };
import fetch from "node-fetch";

function findCategory(query) {
  const lowerQuery = query.toLowerCase();
  return categories.find(cat =>
    lowerQuery.includes(cat.name.toLowerCase().split(" ")[0])
  );
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).send("Method Not Allowed");
  const { messages } = req.body;

  const userMessage = messages[messages.length - 1].content;
  const category = findCategory(userMessage);

  let systemPrompt = {
    role: "system",
    content: `
Ты — Валера танкист 👨‍🔧, опытный автомеханик и спец по тюнингу внедорожников Tank (особенно Tank 300).
Отвечай дружелюбно и профессионально.
Если вопрос про детали/аксессуары — советуй товары с tanktuning.ru.
`,
  };

  if (category) {
    systemPrompt.content += `\nКстати, вот подходящая категория: ${category.url}`;
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [systemPrompt, ...messages],
    }),
  });

  const data = await response.json();
  const reply = data.choices?.[0]?.message?.content || "Ошибка ответа";

  res.status(200).json({ reply });
}
