/**
 * VERCEL SERVERLESS FUNCTION - Busca DataJud Integrada
 *
 * Arquivo: /api/buscar-datajud.js
 *
 * Funcionalidade:
 * - Buscar processos na DataJud por:
 *   1. Número do processo
 *   2. Nome das partes
 *   3. Sincronizar múltiplos processos
 * - Busca em múltiplos tribunais automaticamente
 * - Resolver problema de CORS
 * - Retornar dados consolidados
 *
 * Como usar:
 * curl -X POST https://litteragestao.vercel.app/api/buscar-datajud \
 *   -H "Content-Type: application/json" \
 *   -d "{\"numero\":\"0000001-45.2024.8.26.0100\"}"
 *
 * curl -X POST https://litteragestao.vercel.app/api/buscar-datajud \
 *   -H "Content-Type: application/json" \
 *   -d "{\"partes\":\"João Silva\"}"
 *
 * curl -X POST https://litteragestao.vercel.app/api/buscar-datajud \
 *   -H "Content-Type: application/json" \
 *   -d "{\"sincronizar\":true,\"numeros\":[\"0000001-45.2024.8.26.0100\",\"0000002-45.2024.8.26.0100\"]}"
 */

// ═══════════════════════════════════════════════════════════════
// UTILITÁRIOS DE BUSCA
// ═══════════════════════════════════════════════════════════════

async function buscarEmTribunal(endpoint, queryString, apiKey) {
  try {
    const requestBody = {
      query: {
        query_string: {
          query: queryString
        }
      },
      size: 100
    };

    const response = await fetch(
      `https://api-publica.datajud.cnj.jus.br/${endpoint}/_search`,
      {
        method: 'POST',
        headers: {
          'Authorization': `APIKey ${apiKey}`,
          'Content-Type': 'application/json',
          'User-Agent': 'LITTERA-Client/1.0'
        },
        body: JSON.stringify(requestBody)
      }
    );

    if (!response.ok) {
      console.warn(`⚠️ ${endpoint} retornou ${response.status}`);
      return [];
    }

    const data = await response.json();
    return (data.hits?.hits || []).map(hit => hit._source);
  } catch (error) {
    console.warn(`⚠️ Erro ao buscar em ${endpoint}: ${error.message}`);
    return [];
  }
}

// Lista de todos os tribunais na DataJud
const TODOS_TRIBUNAIS = [
  // Estaduais
  'tjsp', 'tjrj', 'tjmg', 'tjba', 'tjrs', 'tjpr', 'tjpe', 'tjce', 'tjsc',
  'tjgo', 'tjpa', 'tjma', 'tjpb', 'tjes', 'tjpi', 'tjrn', 'tjal', 'tjmt',
  'tjdft', 'tjms', 'tjac', 'tjam', 'tjap', 'tjro', 'tjrr', 'tjto',
  // Federais
  'trf1', 'trf2', 'trf3', 'trf4', 'trf5',
  // Trabalho
  'trt1', 'trt2', 'trt3', 'trt4', 'trt5', 'trt6', 'trt7', 'trt8',
  'trt9', 'trt10', 'trt11', 'trt12', 'trt13', 'trt14', 'trt15',
  'trt16', 'trt17', 'trt18', 'trt19', 'trt20', 'trt21', 'trt22',
  'trt23', 'trt24', 'trt25', 'trt26', 'trt27'
];

function extrairNumeroProcesso(numero) {
  // Remove formatação e retorna apenas números
  return numero.replace(/\D/g, '');
}

function montarQueryProcesso(numero) {
  const numeroLimpo = extrairNumeroProcesso(numero);
  // DataJud usa numeroProcesso como texto, então buscar pelo número
  return `numeroProcesso:${numeroLimpo}*`;
}

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
    const { numero, partes, sincronizar, numeros } = req.body;
    const apiKey = 'cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw==';

    // ═══════════════════════════════════════════════════════════════
    // TIPO 1: SINCRONIZAR MÚLTIPLOS PROCESSOS
    // ═══════════════════════════════════════════════════════════════

    if (sincronizar && numeros && Array.isArray(numeros)) {
      console.log(`🔄 Sincronizando ${numeros.length} processos`);

      const buscasPromises = numeros.map(num => {
        const query = montarQueryProcesso(num);
        // Buscar em todos os tribunais em paralelo
        return Promise.all(
          TODOS_TRIBUNAIS.map(tribunal =>
            buscarEmTribunal(`api_publica_${tribunal}`, query, apiKey)
          )
        ).then(resultados => resultados.flat());
      });

      const todosResultados = await Promise.all(buscasPromises);
      const processosUnicos = [];
      const numerosVistos = new Set();

      for (const lista of todosResultados) {
        for (const proc of lista) {
          const num = proc.numeroProcesso || '';
          if (num && !numerosVistos.has(num)) {
            numerosVistos.add(num);
            processosUnicos.push(proc);
          }
        }
      }

      console.log(`✅ Sincronização concluída: ${processosUnicos.length} processos encontrados`);

      return res.status(200).json({
        ok: true,
        total: processosUnicos.length,
        dados: processosUnicos,
        tipo: 'sincronizacao',
        timestamp: new Date().toISOString()
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // TIPO 2: BUSCAR POR NÚMERO DE PROCESSO
    // ═══════════════════════════════════════════════════════════════

    if (numero) {
      const query = montarQueryProcesso(numero);
      console.log(`🔍 Buscando processo: ${numero}`);

      const resultados = await Promise.all(
        TODOS_TRIBUNAIS.map(tribunal =>
          buscarEmTribunal(`api_publica_${tribunal}`, query, apiKey)
        )
      );

      const processosUnicos = [];
      const numerosVistos = new Set();

      for (const lista of resultados) {
        for (const proc of lista) {
          const num = proc.numeroProcesso || '';
          if (num && !numerosVistos.has(num)) {
            numerosVistos.add(num);
            processosUnicos.push(proc);
          }
        }
      }

      console.log(`✅ Busca concluída: ${processosUnicos.length} resultado(s)`);

      return res.status(200).json({
        ok: true,
        total: processosUnicos.length,
        numero: numero,
        dados: processosUnicos,
        tipo: 'numero',
        timestamp: new Date().toISOString()
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // TIPO 3: BUSCAR POR NOME DAS PARTES
    // ═══════════════════════════════════════════════════════════════

    if (partes) {
      const query = `partes:${partes}`;
      console.log(`👤 Buscando por partes: ${partes}`);

      const resultados = await Promise.all(
        TODOS_TRIBUNAIS.map(tribunal =>
          buscarEmTribunal(`api_publica_${tribunal}`, query, apiKey)
        )
      );

      const processosUnicos = [];
      const numerosVistos = new Set();

      for (const lista of resultados) {
        for (const proc of lista) {
          const num = proc.numeroProcesso || '';
          if (num && !numerosVistos.has(num)) {
            numerosVistos.add(num);
            processosUnicos.push(proc);
          }
        }
      }

      console.log(`✅ Busca concluída: ${processosUnicos.length} resultado(s)`);

      return res.status(200).json({
        ok: true,
        total: processosUnicos.length,
        partes: partes,
        dados: processosUnicos,
        tipo: 'partes',
        timestamp: new Date().toISOString()
      });
    }

    // ═══════════════════════════════════════════════════════════════
    // ERRO: NENHUM PARÂMETRO VÁLIDO
    // ═══════════════════════════════════════════════════════════════

    return res.status(400).json({
      ok: false,
      erro: 'Informe: numero (processo), partes (nome) ou sincronizar (true)',
      exemplo1: { numero: '0000001-45.2024.8.26.0100' },
      exemplo2: { partes: 'João Silva' },
      exemplo3: { sincronizar: true, numeros: ['0000001-45.2024.8.26.0100'] }
    });

  } catch (error) {
    console.error('❌ Erro geral:', error.message);

    let mensagem = error.message;
    let statusCode = 500;

    if (error.message.includes('401')) {
      mensagem = 'API Key DataJud inválida ou expirada';
      statusCode = 401;
    } else if (error.message.includes('timeout') || error.message.includes('ECONNABORTED')) {
      mensagem = 'DataJud demorou demais para responder (timeout)';
      statusCode = 504;
    } else if (error.message.includes('ENOTFOUND')) {
      mensagem = 'Não conseguiu conectar ao DataJud (DNS)';
      statusCode = 503;
    }

    return res.status(statusCode).json({
      ok: false,
      erro: mensagem,
      detalhes: error.message
    });
  }
};
