import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic();

export async function scoreRepo(repo) {
  const readmeSnippet = repo.readme.slice(0, 2000);

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 512,
      system: 'あなたはOSSリポジトリの日本市場適性を評価する専門家です。必ずJSONのみを返してください。説明文や```は不要です。',
      messages: [
        {
          role: 'user',
          content: `以下のOSSリポジトリを日本市場向けに評価してください。

リポジトリ名: ${repo.name}
URL: ${repo.url}
README（先頭2000文字）:
${readmeSnippet}

以下のJSON形式のみで回答してください:
{
  "japan_market": <日本市場適性 1-10>,
  "difficulty": <日本語化難易度 1-10（1=簡単、10=困難）>,
  "sales_potential": <販売可能性 1-10>,
  "reason": "<判定理由を100文字以内の日本語で>"
}`,
        },
      ],
    });

    const text = message.content[0].text.trim();
    return JSON.parse(text);
  } catch {
    return null;
  }
}
