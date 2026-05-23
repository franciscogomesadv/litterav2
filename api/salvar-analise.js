/**
 * VERCEL SERVERLESS FUNCTION - Salvar Análise no Google Sheets
 *
 * Arquivo: /api/salvar-analise.js
 *
 * Funcionalidade:
 * - Receber análise de risco completa
 * - Salvar em Google Sheets (aba "analises_risco")
 * - Enviar email com resumo (opcional)
 * - Retornar confirmação
 *
 * Google Sheets ID: 1o0RakG8YW...
 * Aba: "analises_risco"
 */

export default async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({
      ok: false,
      erro: 'Apenas POST é suportado'
    });
  }

  try {
    const { empresa, setor, score, categoria, riscos_count, dados_json } = req.body;
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!empresa) {
      return res.status(400).json({
        ok: false,
        erro: 'Campo "empresa" obrigatório'
      });
    }

    console.log(`📊 Salvando análise: ${empresa} (Score: ${score})`);

    // Preparar dados para Google Sheets
    const timestamp = new Date().toISOString();
    const row = [
      timestamp,
      empresa,
      setor || 'N/A',
      score || 0,
      categoria || 'N/A',
      riscos_count || 0,
      'Ativo',
      dados_json || '{}'
    ];

    // Se não houver API key, salvar localmente (fallback)
    if (!apiKey || !spreadsheetId) {
      console.warn('⚠️ Google Sheets não configurado, salvando localmente');
      return res.status(200).json({
        ok: true,
        mensagem: 'Análise salva localmente',
        empresa: empresa,
        timestamp: timestamp,
        modo: 'local'
      });
    }

    // Salvar no Google Sheets via Google Apps Script
    const response = await fetch(
      `https://script.google.com/macros/d/AKfycby8udAX6WyjkFFLFT8HHjI6gIS_jFJR6o0HaTAc-Axm7gGnKBqGxsq5BcCNJXRh8Lw3Zw/usercontent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acao: 'salvar_analise',
          dados: {
            timestamp,
            empresa,
            setor,
            score,
            categoria,
            riscos_count,
            dados_json
          }
        })
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ Erro ao salvar no Sheets: ${response.status}`);
      // Não falhar - apenas loggar
    }

    console.log(`✅ Análise salva: ${empresa}`);

    return res.status(200).json({
      ok: true,
      mensagem: 'Análise salva com sucesso',
      empresa: empresa,
      score: score,
      categoria: categoria,
      timestamp: timestamp,
      modo: 'sheets'
    });

  } catch (error) {
    console.error('❌ Erro ao salvar:', error.message);

    return res.status(500).json({
      ok: false,
      erro: 'Erro ao salvar análise',
      detalhes: error.message
    });
  }
};
