/**
 * VERCEL API: Buscar Avaliações de Google Sheets
 * Sincroniza dados de avaliações periódicas salvos no Google Sheets
 */

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const googleAppsScriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;

    if (!googleAppsScriptUrl) {
      return res.status(200).json({
        success: true,
        avaliacoes: [],
        mensagem: 'Google Apps Script não configurado'
      });
    }

    // Buscar dados do Google Apps Script
    const cnpj = req.query.cnpj || null;
    const response = await fetch(googleAppsScriptUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        acao: 'listar_avaliacoes',
        filtro: cnpj
      })
    });

    let avaliacoes = [];

    if (response.ok) {
      const resultado = await response.json();
      avaliacoes = resultado.avaliacoes || [];
    } else {
      console.warn(`⚠️ Google Apps Script retornou ${response.status}`);
    }

    return res.status(200).json({
      success: true,
      avaliacoes: avaliacoes,
      timestamp: new Date().toISOString()
    });

  } catch (erro) {
    console.error('❌ Erro ao buscar avaliações:', erro);
    return res.status(500).json({
      success: false,
      erro: erro.message,
      avaliacoes: []
    });
  }
}
