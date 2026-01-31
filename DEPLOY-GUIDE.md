# 🚀 Guia de Deploy - KeyAuth System

## ❌ PROBLEMA: Netlify não salva dados

O **Netlify é apenas para arquivos estáticos** (HTML, CSS, JS). Ele **NÃO PODE** executar Node.js nem salvar arquivos JSON. Por isso suas keys não salvam!

## ✅ SOLUÇÃO: Backend separado

Você precisa de **2 deploys separados**:

### 1. 🖥️ BACKEND (Render/Railway) - Para salvar dados
### 2. 🌐 FRONTEND (Netlify/Vercel) - Para a interface

---

## 📋 PASSO A PASSO COMPLETO

### ETAPA 1: Deploy do Backend no Render

1. **Acesse**: https://render.com
2. **Crie conta** gratuita
3. **Clique**: "New Web Service"
4. **Conecte**: seu repositório GitHub
5. **Configure**:
   - Name: `keyauth-backend`
   - Build Command: `npm install`
   - Start Command: `npm start`
   - Environment: `Node`
6. **Deploy!** 
7. **ANOTE A URL**: `https://keyauth-backend-xxxx.onrender.com`

### ETAPA 2: Configurar Frontend

1. **Edite** o arquivo `index.html`
2. **Encontre** a linha (aproximadamente linha 500):
   ```javascript
   const API = window.location.origin;
   ```
3. **Substitua** por:
   ```javascript
   const API = 'https://keyauth-backend-xxxx.onrender.com'; // SUA URL DO RENDER
   ```

### ETAPA 3: Deploy do Frontend

**Opção A - Netlify:**
1. Acesse: https://netlify.com
2. Arraste o `index.html` modificado
3. Pronto!

**Opção B - Vercel:**
1. Acesse: https://vercel.com
2. Conecte o repositório
3. Deploy automático

**Opção C - GitHub Pages:**
1. Vá em Settings > Pages no seu repo
2. Ative GitHub Pages
3. Pronto!

---

## 🔧 TESTE RÁPIDO

1. **Abra** seu frontend (Netlify/Vercel)
2. **Tente** criar uma conta
3. **Se funcionar**: ✅ Tudo certo!
4. **Se der erro**: ❌ Verifique a URL da API

---

## 🆘 SOLUÇÃO DE PROBLEMAS

### ❌ "Erro ao conectar com servidor"
- Verifique se a URL do backend está correta no `index.html`
- Teste se o backend está online: acesse `https://sua-url.onrender.com/ping`

### ❌ "Keys não salvam"
- Certifique-se que está usando Render (não Netlify) para o backend
- Verifique os logs no Render

### ❌ "CORS Error"
- Normal na primeira vez
- Aguarde 1-2 minutos para o Render "acordar"

---

## 💡 DICA PRO

Para **desenvolvimento local**:
```bash
# Terminal 1 - Backend
npm start

# Terminal 2 - Teste
npm run test-server
```

Para **produção**:
- Backend: Render/Railway/Fly.io
- Frontend: Netlify/Vercel/GitHub Pages

---

## 📞 AINDA COM PROBLEMAS?

1. ✅ Backend no Render funcionando?
2. ✅ URL correta no `index.html`?
3. ✅ Frontend deployado após mudança?
4. ✅ Aguardou 2 minutos para "acordar"?

Se ainda não funcionar, verifique:
- Console do navegador (F12)
- Logs do Render
- Status do serviço