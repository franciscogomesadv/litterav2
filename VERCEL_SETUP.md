# 🚀 Configuração de Variáveis de Ambiente no Vercel

## 📋 Passo a Passo para Configurar ANTHROPIC_API_KEY

### 1️⃣ Acessar Dashboard do Vercel
- Abra https://vercel.com/dashboard
- Selecione o projeto: **litteragestao**

### 2️⃣ Ir para Settings > Environment Variables
```
Vercel Dashboard 
  └─ litteragestao (projeto)
      └─ Settings (abas no topo)
          └─ Environment Variables
```

### 3️⃣ Adicionar Variável `ANTHROPIC_API_KEY`
- **Name:** `ANTHROPIC_API_KEY`
- **Value:** `sk-ant-api03-[CHAVE GUARDADA EM BACKUP SEGURO]`
- **Environments:** Selecione todos (Production, Preview, Development)
- Clique em "Save"

### 4️⃣ Fazer Deploy
Após salvar, o Vercel automaticamente:
- Detecta mudança em variáveis
- Faz novo deploy com a chave disponível
- Aguarde a conclusão (2-3 minutos)

---

## ✅ Como Verificar se Está Funcionando

### Teste via cURL (terminal):
```bash
curl -X POST https://litteragestao.vercel.app/api/interpretar-movimento \
  -H "Content-Type: application/json" \
  -d '{"movimento":"Audiência de Instrução","tipo_processo":"Cível"}'
```

### Resultado Esperado:
```json
{
  "ok": true,
  "nome": "Audiência de Instrução",
  "dias_uteis": 0,
  "acoes": ["Comparecer", "Apresentar Provas"],
  "gravidade": "crítica",
  "descricao": "Audiência para instrução do processo",
  "ia": false
}
```

Se o movimento **não** estiver no banco:
```json
{
  "ok": true,
  "nome": "Movimento desconhecido",
  "dias_uteis": 15,
  "acoes": ["Manifestação", "Revisar Manualmente"],
  "gravidade": "média",
  "descricao": "Interpretado pela IA - Claude API",
  "ia": true
}
```

---

## 🔧 Detalhes Técnicos

### Arquivo: `/api/interpretar-movimento.js`
- **Endpoint:** POST `/api/interpretar-movimento`
- **Uso:** Interpreta movimentações desconhecidas com Claude
- **Parâmetros:**
  - `movimento` (string): Nome da movimentação
  - `tipo_processo` (string): Tipo (Cível, Federal, Trabalhista, Administrativa)
  
### Fluxo de Fallback:
1. **Primeiro:** Procura no banco local (movimentos-processuais.json)
2. **Se não achar:** Chama Claude API com prompt estruturado
3. **Se Claude falhar:** Retorna fallback genérico (15 dias, gravidade média)
4. **Cache:** Resultado fica salvo em localStorage do cliente

---

## ⚠️ Troubleshooting

### Erro 401 na Claude API?
- ❌ Chave não configurada ou expirada
- ✅ Verifique se `ANTHROPIC_API_KEY` foi salva no Vercel
- ✅ Refaça o deploy

### Erro 500 no endpoint?
- Verifique logs do Vercel: https://vercel.com/litteragestao/functions
- Procure por mensagens de erro em `/api/interpretar-movimento`

### Movimento não sendo reconhecido?
- ✅ Verificar se está no banco: `/data/movimentos-processuais.json`
- ✅ Adicionar ao banco ou deixar Claude interpretar
- ✅ Cache local pode estar armazenando resultado antigo (limpar localStorage)

---

## 📊 Próximos Passos

- [ ] Confirmar que chave foi configurada
- [ ] Fazer deploy no Vercel
- [ ] Testar via cURL ou interface
- [ ] Expandir banco de movimentos de 35 → 70+ tipos
- [ ] Implementar melhorias de fuzzy matching
