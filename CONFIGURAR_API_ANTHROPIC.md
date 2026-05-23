# 🔐 Configurar Chave da API Anthropic no Vercel

## ⚡ Resumo Rápido

Você tem a chave (guardada em backup seguro)

Agora precisa adicionar no Vercel para o sistema usar a IA quando um movimento não for reconhecido.

**Chave já foi guardada em:** `/Backup Plataforma/Status 21.05/0-CREDENCIAIS-E-CHAVES.md`

---

## 📍 Passo a Passo (5 minutos)

### 1. Abrir o Dashboard do Vercel
```
🌐 https://vercel.com/dashboard
```
- Faça login se necessário
- Você verá a lista de projetos

### 2. Clicar no Projeto "litteragestao"
```
Projects
  └─ litteragestao  ← CLIQUE AQUI
```

### 3. Ir para Settings (Configurações)
```
No projeto, procure a aba "Settings" no topo
Ou acesse direto:
🌐 https://vercel.com/litteragestao/settings
```

### 4. Encontrar "Environment Variables"
```
Sidebar esquerdo:
  Environment Variables  ← CLIQUE AQUI
```

### 5. Adicionar a Chave
Clique em **"Add New"** ou **"+ Add"** e preencha:

| Campo | Valor |
|-------|-------|
| **Name** | `ANTHROPIC_API_KEY` |
| **Value** | `sk-ant-api03-[CHAVE GUARDADA EM BACKUP SEGURO]` |
| **Environments** | ✅ Production ✅ Preview ✅ Development |

### 6. Salvar
- Clique em **"Save"** (botão azul)
- Vercel vai mostrar que foi salvo ✅

### 7. Deploy Automático
- Vercel faz novo deploy automaticamente
- Aguarde 2-3 minutos até terminar
- Você verá "Deployment completed ✓" em https://vercel.com/litteragestao

---

## ✅ Verificar se Está Funcionando

### Opção 1: Testar pela Interface (Recomendado)
1. Abra a aplicação: https://litteragestao.vercel.app
2. Vá para a aba **"Publicações"**
3. Faça uma busca por um movimento desconhecido
4. Se Claude interpretar, verá o indicador 🤖

### Opção 2: Testar via Terminal (Para verificação técnica)
```bash
curl -X POST https://litteragestao.vercel.app/api/interpretar-movimento \
  -H "Content-Type: application/json" \
  -d '{"movimento":"Manifestação de Interesse","tipo_processo":"Cível"}'
```

**Resultado esperado:**
```json
{
  "ok": true,
  "nome": "Manifestação de Interesse",
  "dias_uteis": 10,
  "acoes": ["Manifestação", "Resposta"],
  "gravidade": "média",
  "descricao": "Manifestação da vontade das partes",
  "ia": true,
  "timestamp": "2026-05-22T15:30:00.000Z"
}
```

---

## 🐛 Se Algo Não Funcionar

### ❌ Erro 401 (Unauthorized)
**Problema:** Chave não configurada ou expirada  
**Solução:**
1. Verifique se a chave foi salva no Vercel
2. Confira se está em TODOS os environments (Production, Preview, Development)
3. Refaça o deploy manualmente no Vercel

### ❌ Erro 500 (Server Error)
**Problema:** Erro na execução  
**Solução:**
1. Vá em https://vercel.com/litteragestao
2. Abra a aba **"Deployments"**
3. Clique no deploy mais recente
4. Veja os **"Logs"** para detalhes do erro
5. Procure por mensagens de erro referentes à API

### ❌ Movimento não reconhecido, mas não chama Claude
**Problema:** Chave não está disponível ou há erro silencioso  
**Solução:**
1. Limpe o cache do navegador (Ctrl+Shift+Delete)
2. Feche e reabra a aplicação
3. Tente novamente

---

## 💾 Backup da Chave

✅ **Já foi salvo em:**
```
/backup/chaves-api.txt  (documento de backup)
```

Nunca compartilhe essa chave publicamente!
- Não envie em emails públicos
- Não faça push em repositórios públicos
- Use apenas em variáveis de ambiente do Vercel

---

## 🎯 Próximos Passos Após Configurar

1. ✅ Chave configurada no Vercel
2. ⏳ Aguardar deploy completar (2-3 min)
3. 🧪 Testar a busca com um movimento desconhecido
4. 📚 Expandir banco de movimentos de 35 → 70+ tipos
5. 🔍 Melhorar fuzzy matching

---

## 📞 Suporte Rápido

Se tiver dúvida:

1. **Vercel está offline?** Verifique em https://www.vercel-status.com
2. **Chave expirada?** Gere nova em https://console.anthropic.com
3. **Projeto não foi encontrado?** Verifique o nome em https://vercel.com/dashboard

---

**Status:** Pronto para configurar! 🚀
