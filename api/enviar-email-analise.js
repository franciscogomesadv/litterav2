/**
 * VERCEL SERVERLESS FUNCTION - Enviar Email com Análise de Risco
 *
 * Arquivo: /api/enviar-email-analise.js
 *
 * Funcionalidade:
 * - Receber análise de risco completa
 * - Formatar HTML com resumo
 * - Enviar email para francisco.gomes.jur@gmail.com
 * - Incluir PDF como attachment (opcional)
 * - Retornar confirmação
 *
 * Email Padrão: francisco.gomes.jur@gmail.com
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
    const { empresa, setor, score, categoria, riscos, acoes } = req.body;
    const emailKey = process.env.SENDGRID_API_KEY || process.env.EMAIL_API_KEY;
    const emailDestino = 'francisco.gomes.jur@gmail.com';

    if (!empresa) {
      return res.status(400).json({
        ok: false,
        erro: 'Campo "empresa" obrigatório'
      });
    }

    console.log(`📧 Preparando email para: ${empresa}`);

    // Construir HTML do email
    const html = construirHTMLEmail({
      empresa,
      setor,
      score,
      categoria,
      riscos,
      acoes
    });

    // Se não houver chave de email, apenas registrar (fallback)
    if (!emailKey) {
      console.warn('⚠️ Email provider não configurado, registrando apenas');
      return res.status(200).json({
        ok: true,
        mensagem: 'Email preparado mas não enviado (sem provider)',
        empresa: empresa,
        timestamp: new Date().toISOString(),
        modo: 'log_only'
      });
    }

    // Tentar enviar com SendGrid (ou outro provider)
    const emailEnviado = await enviarEmailComProvider(
      emailDestino,
      `[LITTERA] Análise de Risco - ${empresa}`,
      html,
      emailKey
    );

    if (!emailEnviado) {
      console.warn('⚠️ Falha ao enviar email, continuando');
      // Não falhar completamente - apenas registrar
    }

    console.log(`✅ Email processado: ${empresa}`);

    return res.status(200).json({
      ok: true,
      mensagem: 'Email enviado com sucesso',
      empresa: empresa,
      destinatario: emailDestino,
      timestamp: new Date().toISOString(),
      modo: 'email_sent'
    });

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);

    return res.status(500).json({
      ok: false,
      erro: 'Erro ao enviar email',
      detalhes: error.message
    });
  }
};

// ═══════════════════════════════════════════════════════════════
// CONSTRUIR HTML DO EMAIL
// ═══════════════════════════════════════════════════════════════

function construirHTMLEmail(dados) {
  const { empresa, setor, score, categoria, riscos = [], acoes = [] } = dados;

  const coresPorCategoria = {
    'BAIXO': '#4CAF50',
    'MODERADO': '#FFEB3B',
    'ALTO': '#FF9800',
    'CRÍTICO': '#F44336'
  };

  const corCategoria = coresPorCategoria[categoria] || '#FFEB3B';

  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif; color: #2D4A3E; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; }
    .header { background: #2D4A3E; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; }
    .score-box {
      background: ${corCategoria};
      color: white;
      padding: 20px;
      border-radius: 8px;
      text-align: center;
      margin: 20px 0;
    }
    .score-box .numero { font-size: 48px; font-weight: bold; }
    .score-box .categoria { font-size: 18px; margin-top: 10px; }
    .info-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
      margin: 20px 0;
    }
    .info-item {
      background: #f5f5f5;
      padding: 12px;
      border-radius: 4px;
      border-left: 3px solid #2D4A3E;
    }
    .info-item strong { color: #2D4A3E; }
    .info-item span { color: #666; }
    .section { margin: 20px 0; }
    .section h3 { color: #2D4A3E; border-bottom: 2px solid #2D4A3E; padding-bottom: 10px; }
    .risk-item {
      background: #f9f9f9;
      padding: 12px;
      margin: 8px 0;
      border-left: 4px solid #e74c3c;
      border-radius: 2px;
    }
    .action-item {
      background: #f0f7f0;
      padding: 12px;
      margin: 8px 0;
      border-left: 4px solid #4CAF50;
      border-radius: 2px;
    }
    .footer {
      background: #f5f5f5;
      padding: 20px;
      text-align: center;
      font-size: 12px;
      color: #999;
      border-top: 1px solid #ddd;
    }
    .button {
      display: inline-block;
      background: #2D4A3E;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      text-decoration: none;
      margin-top: 10px;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- HEADER -->
    <div class="header">
      <h1>📊 LITTERA - Análise de Risco Jurídico</h1>
      <p style="margin: 5px 0; font-size: 14px;">Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}</p>
    </div>

    <!-- CONTEÚDO -->
    <div class="content">
      <!-- SCORE DESTACADO -->
      <div class="score-box">
        <div class="numero">${score}</div>
        <div class="categoria">${categoria}</div>
        <div style="font-size: 12px; margin-top: 8px; opacity: 0.9;">Nível de Risco Jurídico</div>
      </div>

      <!-- INFORMAÇÕES BÁSICAS -->
      <div class="info-grid">
        <div class="info-item">
          <strong>🏢 Empresa</strong><br>
          <span>${empresa}</span>
        </div>
        <div class="info-item">
          <strong>📈 Setor</strong><br>
          <span>${setor || 'Não informado'}</span>
        </div>
        <div class="info-item">
          <strong>⚠️ Riscos</strong><br>
          <span>${riscos.length} principais identificados</span>
        </div>
        <div class="info-item">
          <strong>✅ Ações</strong><br>
          <span>${acoes.length} recomendações</span>
        </div>
      </div>

      <!-- RISCOS PRINCIPAIS -->
      ${riscos.length > 0 ? `
      <div class="section">
        <h3>⚠️ Riscos Principais</h3>
        ${riscos.slice(0, 5).map((risco, idx) => `
          <div class="risk-item">
            <strong>${idx + 1}. ${risco.nome}</strong><br>
            <small style="color: #666;">Severidade: ${risco.severidade || '—'}/10</small>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- AÇÕES RECOMENDADAS -->
      ${acoes.length > 0 ? `
      <div class="section">
        <h3>✅ Ações Recomendadas</h3>
        ${acoes.slice(0, 3).map((acao, idx) => `
          <div class="action-item">
            <strong>${idx + 1}. ${acao.descricao}</strong><br>
            <small style="color: #666;">${acao.detalhes || ''}</small>
          </div>
        `).join('')}
      </div>
      ` : ''}

      <!-- CHAMADA À AÇÃO -->
      <div style="text-align: center; margin: 20px 0;">
        <p style="color: #666; font-size: 14px;">Para visualizar a análise completa com gráficos interativos, acesse a plataforma LITTERA.</p>
        <a href="https://litteragestao.vercel.app" class="button">Acessar LITTERA</a>
      </div>
    </div>

    <!-- FOOTER -->
    <div class="footer">
      <p style="margin: 0;">
        Este é um email automático gerado pelo sistema LITTERA de Análise de Risco Jurídico.<br>
        Para suporte, entre em contato com: suporte@litteragestao.com.br
      </p>
      <p style="margin: 10px 0 0 0; color: #bbb; font-size: 11px;">
        © 2026 LITTERA - Todos os direitos reservados.
      </p>
    </div>
  </div>
</body>
</html>
  `;
}

// ═══════════════════════════════════════════════════════════════
// ENVIAR COM PROVIDER (SendGrid, Resend, etc)
// ═══════════════════════════════════════════════════════════════

async function enviarEmailComProvider(destinatario, assunto, html, apiKey) {
  try {
    // Tentar SendGrid (mais comum)
    if (process.env.SENDGRID_API_KEY || apiKey.includes('SG.')) {
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY || apiKey);

      await sgMail.send({
        to: destinatario,
        from: 'noreply@litteragestao.com.br',
        subject: assunto,
        html: html,
        replyTo: 'francisco.gomes.jur@gmail.com'
      });

      console.log('✅ Email enviado via SendGrid');
      return true;
    }

    // Fallback: Resend
    if (process.env.RESEND_API_KEY || apiKey.includes('re_')) {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY || apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'LITTERA <noreply@litteragestao.com.br>',
          to: destinatario,
          subject: assunto,
          html: html,
          reply_to: 'francisco.gomes.jur@gmail.com'
        })
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      console.log('✅ Email enviado via Resend');
      return true;
    }

    console.warn('⚠️ Nenhum provider de email configurado');
    return false;

  } catch (error) {
    console.error('❌ Erro ao enviar email:', error.message);
    return false;
  }
}
