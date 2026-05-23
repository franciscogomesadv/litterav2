/**
 * VERCEL SERVERLESS FUNCTION - Análise de Risco com Claude
 *
 * Arquivo: /api/analisar-risco.js
 *
 * Funcionalidade:
 * - Receber dados da empresa e riscos identificados
 * - Chamar Claude API para análise de risco jurídico
 * - Gerar score 0-100
 * - Categorizar (BAIXO, MODERADO, ALTO, CRÍTICO)
 * - Retornar ações recomendadas
 *
 * Como usar:
 * curl -X POST https://litteragestao.vercel.app/api/analisar-risco \
 *   -H "Content-Type: application/json" \
 *   -d '{
 *     "empresa": {
 *       "nome": "Empresa XYZ",
 *       "setor": "Tecnologia",
 *       "funcionarios": 50,
 *       "riscos": [
 *         { "descricao": "Trabalhista", "categoria": "Trabalhista" }
 *       ]
 *     }
 *   }'
 */

// ═══════════════════════════════════════════════════════════════
// ANÁLISE COM CLAUDE
// ═══════════════════════════════════════════════════════════════

async function analisarComClaude(empresa, apiKey) {
  try {
    const prompt = gerarPromptAnaliseRisco(empresa);

    console.log(`🤖 Enviando para Claude API...`);
    console.log(`📊 Empresa: ${empresa.nome} | Riscos: ${empresa.riscos?.length || 0}`);

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: 'claude-3-opus-20240229',
        max_tokens: 2000,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ]
      })
    });

    if (!response.ok) {
      const erro = await response.text();
      throw new Error(`Claude API retornou ${response.status}: ${erro}`);
    }

    const data = await response.json();
    const textoClaude = data.content[0].text;

    console.log(`✅ Resposta Claude recebida (${textoClaude.length} caracteres)`);

    // Parser resposta Claude
    const analise = parseRespostaClaude(textoClaude);

    return analise;

  } catch (error) {
    console.error('❌ Erro Claude:', error.message);
    throw error;
  }
}

// ═══════════════════════════════════════════════════════════════
// PROMPT ENGINEERING
// ═══════════════════════════════════════════════════════════════

function gerarPromptAnaliseRisco(empresa) {
  const riscos = (empresa.riscos || [])
    .map(r => `- ${r.categoria}: ${r.descricao}`)
    .join('\n');

  return `Você é um especialista jurídico em análise de risco empresarial com 20+ anos de experiência.

EMPRESA ANALISADA:
- Nome: ${empresa.nome}
- Setor: ${empresa.setor || 'Não informado'}
- Funcionários: ${empresa.funcionarios || 0}
- Faturamento: ${empresa.faturamento || 'Não informado'}
- Localização: ${empresa.cidade || 'Não informado'}

RISCOS JURÍDICOS IDENTIFICADOS:
${riscos || '- Nenhum risco específico identificado'}

TAREFAS:
1. Analise TODOS os riscos identificados
2. Gere um SCORE de 0-100 onde:
   - 0-20: Risco Baixo (empresa bem preparada)
   - 21-50: Risco Moderado (algumas vulnerabilidades)
   - 51-75: Risco Alto (problemas significativos)
   - 76-100: Risco Crítico (ação imediata necessária)

3. Categorize como: BAIXO | MODERADO | ALTO | CRÍTICO
4. Identifique os 5 RISCOS PRINCIPAIS com severidade (1-10)
5. Recomende 3 AÇÕES IMEDIATAS prioritárias

FORMATO DE RESPOSTA (EXATAMENTE ASSIM):
SCORE: [número 0-100]
CATEGORIA: [BAIXO|MODERADO|ALTO|CRÍTICO]
COR: [#00FF00|#FFFF00|#FF9800|#FF0000]

RISCOS PRINCIPAIS:
- [Risco]: [Severidade 1-10]
- [Risco]: [Severidade 1-10]
- [Risco]: [Severidade 1-10]
- [Risco]: [Severidade 1-10]
- [Risco]: [Severidade 1-10]

AÇÕES RECOMENDADAS:
- [Ação 1]: Impacto Alto | Urgência: Imediata
- [Ação 2]: Impacto Alto | Urgência: Imediata
- [Ação 3]: Impacto Médio | Urgência: Curto prazo

ANÁLISE ADICIONAL:
[Um parágrafo com análise contextual da empresa]`;
}

// ═══════════════════════════════════════════════════════════════
// PARSER RESPOSTA CLAUDE
// ═══════════════════════════════════════════════════════════════

function parseRespostaClaude(texto) {
  const analise = {};

  // Extrair SCORE
  const scoreMatch = texto.match(/SCORE:\s*(\d+)/i);
  analise.score = scoreMatch ? parseInt(scoreMatch[1]) : 50;

  // Extrair CATEGORIA
  const categoriaMatch = texto.match(/CATEGORIA:\s*(BAIXO|MODERADO|ALTO|CRÍTICO)/i);
  analise.categoria = categoriaMatch ? categoriaMatch[1] : 'MODERADO';

  // Extrair COR
  const corMatch = texto.match(/COR:\s*(#[0-9A-Fa-f]{6})/i);
  analise.cor = corMatch ? corMatch[1] : '#FFFF00';

  // Garantir cor correta por categoria
  const coresPorCategoria = {
    'BAIXO': '#00FF00',
    'MODERADO': '#FFFF00',
    'ALTO': '#FF9800',
    'CRÍTICO': '#FF0000'
  };
  analise.cor = coresPorCategoria[analise.categoria] || analise.cor;

  // Extrair RISCOS PRINCIPAIS
  analise.riscos = [];
  const secaoRiscos = texto.match(/RISCOS PRINCIPAIS:([\s\S]*?)(?=AÇÕES RECOMENDADAS|$)/i);
  if (secaoRiscos) {
    const linhasRiscos = secaoRiscos[1].split('\n').filter(l => l.match(/^-\s+/));
    linhasRiscos.forEach(linha => {
      const match = linha.match(/^-\s+([^:]+):\s*(\d+)/);
      if (match) {
        analise.riscos.push({
          nome: match[1].trim(),
          severidade: parseInt(match[2])
        });
      }
    });
  }

  // Extrair AÇÕES RECOMENDADAS
  analise.acoes = [];
  const secaoAcoes = texto.match(/AÇÕES RECOMENDADAS:([\s\S]*?)(?=ANÁLISE ADICIONAL|$)/i);
  if (secaoAcoes) {
    const linhasAcoes = secaoAcoes[1].split('\n').filter(l => l.match(/^-\s+/));
    linhasAcoes.slice(0, 3).forEach(linha => {
      const match = linha.match(/^-\s+([^:]+):\s*(.*)/);
      if (match) {
        analise.acoes.push({
          descricao: match[1].trim(),
          detalhes: match[2].trim()
        });
      }
    });
  }

  // Extrair ANÁLISE ADICIONAL
  const secaoAnalise = texto.match(/ANÁLISE ADICIONAL:([\s\S]*?)$/i);
  if (secaoAnalise) {
    analise.analiseAdicional = secaoAnalise[1].trim().substring(0, 500);
  }

  console.log('✅ Parse completado:', {
    score: analise.score,
    categoria: analise.categoria,
    riscos: analise.riscos.length,
    acoes: analise.acoes.length
  });

  return analise;
}

// ═══════════════════════════════════════════════════════════════
// HANDLER VERCEL
// ═══════════════════════════════════════════════════════════════

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
    const { empresa } = req.body;
    const apiKey = process.env.ANTHROPIC_API_KEY;

    if (!empresa) {
      return res.status(400).json({
        ok: false,
        erro: 'Campo "empresa" obrigatório'
      });
    }

    if (!apiKey) {
      console.error('❌ ANTHROPIC_API_KEY não configurada');
      return res.status(500).json({
        ok: false,
        erro: 'API Key não configurada no servidor'
      });
    }

    console.log(`\n🔍 Análise iniciada: ${empresa.nome}`);

    // Chamar Claude
    const analise = await analisarComClaude(empresa, apiKey);

    // Resposta sucesso
    return res.status(200).json({
      ok: true,
      empresa: empresa.nome,
      analise: analise,
      timestamp: new Date().toISOString(),
      modelo: 'claude-3-opus-20240229',
      versao: '1.0'
    });

  } catch (error) {
    console.error('❌ Erro geral:', error.message);

    let statusCode = 500;
    let mensagem = error.message;

    if (error.message.includes('401')) {
      statusCode = 401;
      mensagem = 'API Key inválida ou expirada';
    } else if (error.message.includes('timeout')) {
      statusCode = 504;
      mensagem = 'Claude demorou muito para responder (timeout)';
    } else if (error.message.includes('rate limit')) {
      statusCode = 429;
      mensagem = 'Limite de requisições atingido. Tente novamente em 1 minuto.';
    }

    return res.status(statusCode).json({
      ok: false,
      erro: mensagem,
      detalhes: error.message,
      timestamp: new Date().toISOString()
    });
  }
};
