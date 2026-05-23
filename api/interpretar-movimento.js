/**
 * VERCEL SERVERLESS FUNCTION - Interpretar Movimentação com Claude API
 *
 * Arquivo: /api/interpretar-movimento.js
 *
 * Funcionalidade:
 * - Receber nome de movimentação desconhecida
 * - Usar Claude API para interpretar e sugerir:
 *   1. Dias úteis (prazo)
 *   2. Ações sugeridas (Contestação, Recurso, Manifestação, etc)
 *   3. Gravidade (crítica, alta, média, baixa)
 *   4. Descrição
 * - Cachear resultados para evitar chamadas repetidas
 * - Retornar em formato compatível com movimentos-processuais.json
 *
 * Como usar:
 * curl -X POST https://litteragestao.vercel.app/api/interpretar-movimento \
 *   -H "Content-Type: application/json" \
 *   -d "{\"movimento\":\"Audiência de Instrução e Julgamento\",\"tipo_processo\":\"Cível\"}"
 */

export default async (req, res) => {
  // ═══════════════════════════════════════════════════════════════
  // CONFIGURAÇÃO CORS
  // ═══════════════════════════════════════════════════════════════

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
    const { movimento, tipo_processo } = req.body;

    if (!movimento || !tipo_processo) {
      return res.status(400).json({
        ok: false,
        erro: 'Informe movimento e tipo_processo',
        exemplo: {
          movimento: 'Audiência de Instrução',
          tipo_processo: 'Cível'
        }
      });
    }

    // Usar Claude API para interpretar o movimento
    const prompt = `Você é um especialista em processo jurídico brasileiro. Analise a seguinte movimentação processual e retorne um JSON com as informações.

Movimentação: "${movimento}"
Tipo de Processo: "${tipo_processo}"

Retorne APENAS um JSON válido (sem markdown, sem explicação) com este formato:
{
  "dias_uteis": <número inteiro representando o prazo em dias úteis>,
  "acoes": [<lista de ações sugeridas como strings, ex: "Contestação", "Recurso", "Manifestação">],
  "gravidade": "<crítica|alta|média|baixa>",
  "descricao": "<descrição breve em português>"
}

Regras:
- Movimentações de prazo exíguo (1-2 dias): gravidade crítica
- Movimentações com prazo curto (3-7 dias): gravidade alta
- Movimentações com prazo médio (8-15 dias): gravidade média
- Movimentações com prazo longo ou indefinido (>15 dias): gravidade baixa
- Audiências e audiências de julgamento têm dias_uteis = 0 (são eventos, não prazos)
- Para tipo_processo "Cível": priorize ações como Contestação, Recurso de Apelação, Agravo, Embargos
- Para tipo_processo "Trabalhista": considere particularidades da Justiça do Trabalho
- Para tipo_processo "Federal": considere regras federais
- Para tipo_processo "Administrativa": considere recursos administrativos`;

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY || ''
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.warn(`⚠️ Claude API retornou ${response.status}:`, errorData);

      // Fallback: retornar movimento genérico
      return res.status(200).json({
        ok: true,
        nome: movimento,
        sinonimos: [],
        tipo_processo: [tipo_processo],
        dias_uteis: 15,
        acoes: ['Manifestação', 'Revisar Prazo'],
        gravidade: 'média',
        descricao: 'Movimento não catalogado (fallback)',
        ia: true,
        erro_ia: true
      });
    }

    const claudeResponse = await response.json();
    const content = claudeResponse.content[0]?.text || '{}';

    // Tentar fazer parse do JSON
    let movimentoInterpretado = {};
    try {
      movimentoInterpretado = JSON.parse(content);
    } catch (parseError) {
      console.warn('⚠️ Erro ao fazer parse da resposta Claude:', content);
      // Tentar extrair JSON da resposta
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          movimentoInterpretado = JSON.parse(jsonMatch[0]);
        } catch (e) {
          // Fallback final
          movimentoInterpretado = {
            dias_uteis: 15,
            acoes: ['Manifestação'],
            gravidade: 'média',
            descricao: 'Movimento não catalogado (erro parse)'
          };
        }
      }
    }

    // Validar e normalizar resposta
    const resultado = {
      ok: true,
      nome: movimento,
      sinonimos: [],
      tipo_processo: [tipo_processo],
      dias_uteis: Math.max(0, Math.min(120, parseInt(movimentoInterpretado.dias_uteis) || 15)),
      acoes: Array.isArray(movimentoInterpretado.acoes) ? movimentoInterpretado.acoes : ['Manifestação'],
      gravidade: ['crítica', 'alta', 'média', 'baixa'].includes(movimentoInterpretado.gravidade)
        ? movimentoInterpretado.gravidade
        : 'média',
      descricao: movimentoInterpretado.descricao || 'Interpretado por IA',
      ia: true,
      timestamp: new Date().toISOString()
    };

    return res.status(200).json(resultado);

  } catch (error) {
    console.error('❌ Erro geral:', error.message);

    return res.status(500).json({
      ok: false,
      erro: 'Erro ao interpretar movimento',
      detalhes: error.message
    });
  }
};
