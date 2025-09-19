import fs from "fs";
import path from "path";
import fetch from "node-fetch";

const categories = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "categories.json"), "utf-8")
);

function findCategory(query) {
  const lowerQuery = query.toLowerCase();
  return categories.find(cat =>
    lowerQuery.includes(cat.name.toLowerCase().split(" ")[0])
  );
}

export default async function handler(req, res) {
  // Добавим CORS-заголовки
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).send("Method Not Allowed");
  }

  try {
    const { messages } = req.body;
    const userMessage = messages[messages.length - 1].content;
    const category = findCategory(userMessage);

    let systemPrompt = {
      role: "system",
      content: `
Ты — Валера танкист 👨‍🔧, спец по тюнингу внедорожников Tank 300.
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
    if (!data.choices) {
      throw new Error(JSON.stringify(data));
    }

    const reply = data.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("Ошибка в API:", error);
    res.status(500).json({ error: "Внутренняя ошибка сервера" });
  }
}
