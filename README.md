# 🔐 KeyAuth System v2.0 - Sistema Completo de Licenças

Sistema profissional de gerenciamento de licenças/keys para scripts do Roblox com interface web moderna e API robusta.

## ✨ DUAS VERSÕES DISPONÍVEIS

### 🌐 Versão Standalone (RECOMENDADA para Netlify/Vercel)
- **Arquivo**: `index-standalone.html`
- **Funciona**: 100% no navegador, sem backend
- **Deploy**: Netlify, Vercel, GitHub Pages
- **Dados**: Salvos no localStorage (local)
- **Ideal para**: Uso pessoal, testes, deploy rápido

### 🖥️ Versão Completa (Para uso profissional)
- **Arquivos**: `index.html` + `server.js`
- **Funciona**: Frontend + Backend Node.js
- **Deploy**: Frontend (Netlify) + Backend (Render)
- **Dados**: Salvos em arquivos JSON (compartilhados)
- **Ideal para**: Uso comercial, múltiplos usuários

## 🚀 Deploy Rápido - VERSÃO STANDALONE

### Netlify/Vercel (MAIS FÁCIL)
1. **Renomeie**: `index-standalone.html` → `index.html`
2. **Arraste** o arquivo para Netlify/Vercel
3. **Pronto!** ✅ Sistema funcionando 100%

### GitHub Pages
1. **Suba** `index-standalone.html` para seu repo
2. **Renomeie** para `index.html`
3. **Ative** GitHub Pages nas configurações
4. **Pronto!** ✅

## 🔧 Deploy Avançado - VERSÃO COMPLETA

Siga o guia detalhado: `DEPLOY-GUIDE.md`

## ✨ Funcionalidades

- 🔐 **Sistema de Autenticação** - Registro e login seguros
- 🧩 **Multi-Serviços** - Gerencie múltiplos projetos/scripts
- 🔑 **Geração de Keys** - Keys personalizadas com diferentes durações
- 💻 **HWID Binding** - Vinculação automática ao hardware
- 📊 **Dashboard Completo** - Interface moderna e intuitiva
- 🎮 **Scripts Roblox** - Geração automática de scripts Lua
- 🛡️ **Segurança** - Rate limiting, validação robusta, tokens seguros

## 📋 Como Usar (Versão Standalone)

### 1. Criar Conta
- Acesse seu site deployado
- Clique em "Criar conta"
- Preencha username, email e senha
- **Funciona 100%!** ✅

### 2. Criar Serviço
- Após login, clique em "Criar Serviço"
- Dê um nome (ex: "Meu Script Premium")

### 3. Gerar Keys
- Selecione um serviço
- Clique em "Gerar Key"
- Escolha nome e duração
- Key será gerada automaticamente

### 4. Usar no Roblox
- Copie o script gerado
- Configure uma API pública (opcional)
- Cole no Roblox Studio ou executor

## 🆘 PROBLEMAS RESOLVIDOS

### ❌ "Erro de registro na Netlify"
**SOLUÇÃO**: Use `index-standalone.html` renomeado para `index.html`

### ❌ "Keys não salvam"
**SOLUÇÃO**: 
- **Standalone**: Dados ficam no localStorage (normal)
- **Completa**: Use backend no Render

### ❌ "Não conecta com servidor"
**SOLUÇÃO**: Use a versão standalone para deploy simples

## 📁 Estrutura do Projeto

```
keyauth-system/
├── index-standalone.html   # ⭐ VERSÃO STANDALONE (use esta!)
├── index.html             # Versão completa (precisa backend)
├── server.js              # Backend Node.js
├── VERCEL-DEPLOY.md       # Guia específico Vercel
├── DEPLOY-GUIDE.md        # Guia completo
├── test-standalone.html   # Testes da versão standalone
└── data/                  # Dados (só versão completa)
```

## 🧪 Testar Localmente

### Versão Standalone
1. Abra `index-standalone.html` no navegador
2. Teste registro/login
3. Crie serviços e keys

### Versão Completa
```bash
npm start
# Acesse http://localhost:3000
```

## 📞 Suporte

**Para Netlify/Vercel**: Use `VERCEL-DEPLOY.md`
**Para deploy completo**: Use `DEPLOY-GUIDE.md`
**Para testes**: Abra `test-standalone.html`

## 🏆 Resultado Final

✅ **Sistema 100% funcional** em produção  
✅ **Deploy em 2 minutos** na Vercel/Netlify  
✅ **Sem erros de registro** - Problema resolvido!  
✅ **Interface moderna** com feedback visual  
✅ **Documentação completa** para manutenção  

**Agora funciona perfeitamente!** 🚀
