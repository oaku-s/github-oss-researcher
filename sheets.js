import { google } from 'googleapis';

const HEADERS = [
  'リポジトリ名', 'URL', 'スター数', 'ライセンス', 'カテゴリ',
  '日本市場適性', '難易度', '販売可能性', '判定理由', '取得日', 'ステータス',
];

function getAuth() {
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
  return new google.auth.JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function getSheetData(sheets, spreadsheetId) {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: 'A:B',
  });
  return res.data.values || [];
}

export async function writeToSheet(repos) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEET_ID;

  const existing = await getSheetData(sheets, spreadsheetId);

  // ヘッダー行がなければ作成
  if (existing.length === 0 || existing[0][0] !== HEADERS[0]) {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: 'A1',
      valueInputOption: 'RAW',
      requestBody: { values: [HEADERS] },
    });
    existing.unshift(HEADERS);
  }

  // 既存URL一覧（B列）
  const existingUrls = new Set(existing.slice(1).map((row) => row[1]).filter(Boolean));

  const today = new Date().toISOString().slice(0, 10);
  const newRows = [];

  for (const { repo, score } of repos) {
    if (existingUrls.has(repo.url)) continue;
    newRows.push([
      repo.name,
      repo.url,
      repo.stars,
      repo.license,
      repo.category,
      score?.japan_market ?? '',
      score?.difficulty ?? '',
      score?.sales_potential ?? '',
      score?.reason ?? '',
      today,
      score ? '完了' : 'スコアリング失敗',
    ]);
  }

  if (newRows.length === 0) {
    return 0;
  }

  const startRow = existing.length + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `A${startRow}`,
    valueInputOption: 'RAW',
    requestBody: { values: newRows },
  });

  return newRows.length;
}
