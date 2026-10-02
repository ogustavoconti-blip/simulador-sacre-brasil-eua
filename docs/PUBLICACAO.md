# Publicação passo a passo

O simulador é um site estático: só arquivos (HTML, JavaScript, CSS, fontes e JSON), sem servidor de aplicação e sem banco de dados. Ele fica no **GitHub Pages**, com HTTPS, de graça.

Depois de configurado, tudo é automático:

- **Mudou algo no repositório** (código ou parâmetros): o GitHub roda os testes, gera o site e publica. Se um teste falhar, nada é publicado e o site continua na versão anterior.
- **Dias úteis às 08:30 de Brasília:** a rotina busca os dados do Banco Central, grava `public/dados/mercado.json` se houver novidade e publica de novo.

Nos passos abaixo, troque `USUARIO` pelo seu nome de usuário no GitHub.

## 1. Criar o repositório

1. Entre em <https://github.com> com a sua conta.
2. Clique em **New repository** (botão verde, ou <https://github.com/new>).
3. **Repository name:** `simulador-sacre-brasil-eua`.
4. **Public.** O GitHub Pages gratuito exige repositório público. O código e os parâmetros ficam visíveis; nenhum dado de usuário passa por ali.
5. Não marque README, .gitignore nem licença: o repositório precisa nascer vazio.
6. **Create repository.**

## 2. Enviar o código

No computador, na pasta do projeto, num terminal:

```bash
git remote add origin https://github.com/USUARIO/simulador-sacre-brasil-eua.git
```

```bash
git push -u origin main
```

Na primeira vez, o Git abre uma janela do navegador para você entrar no GitHub e autorizar. A senha nunca passa pelo terminal.

## 3. Ligar o GitHub Pages

1. No repositório: **Settings → Pages**.
2. Em **Build and deployment → Source**, escolha **GitHub Actions**.

## 4. Permitir que a rotina de mercado grave o arquivo

1. **Settings → Actions → General**.
2. Em **Workflow permissions**, marque **Read and write permissions** e salve.

## 5. Primeira publicação

1. Aba **Actions**. O workflow **Publicar o site (GitHub Pages)** já deve estar rodando por causa do envio do passo 2. Se tiver falhado por falta do passo 3, clique nele e em **Re-run all jobs**.
2. Rode a rotina de mercado uma vez à mão: **Actions → Atualizar dados de mercado (BCB) → Run workflow**. Depois dela, o site é publicado de novo sozinho.
3. Quando ficar verde, o site está em:

   **https://USUARIO.github.io/simulador-sacre-brasil-eua/**

## 6. Conferir o site publicado

- Abra o link no computador, no celular e, se possível, no Safari e no Firefox.
- Percorra as 7 etapas. Em "Entenda o cálculo", confira as datas: parâmetros revisados e dados de mercado.
- No rodapé da etapa 1: aviso obrigatório.

## 7. Domínio próprio (recomendado antes de imprimir o e-book)

O QR code impresso não muda depois. Com um subdomínio da Sacre, por exemplo `simulador.sacre.com.br`, o link do e-book fica estável mesmo se o repositório mudar de conta.

1. No provedor de DNS do domínio, crie um registro **CNAME**: nome `simulador`, destino `USUARIO.github.io`.
2. No repositório: **Settings → Pages → Custom domain**, digite `simulador.sacre.com.br` e salve.
3. Quando o GitHub validar, marque **Enforce HTTPS**.
4. Gere o QR code com o novo link (passo 8).

## 8. QR code para o e-book

Com o link definitivo (do passo 5 ou do passo 7):

```bash
npm run qrcode -- https://USUARIO.github.io/simulador-sacre-brasil-eua/
```

Sai em `docs/publicacao/`:

- `qrcode.svg`: vetor, para a gráfica (qualquer tamanho sem perder nitidez);
- `qrcode.png`: 1200 × 1200 px, para uso digital.

O código usa correção de erro alta. Na impressão, deixe pelo menos 2 cm de lado e a margem branca em volta. Teste com a câmera de 2 celulares antes de mandar para a gráfica.

## 9. Antes de divulgar

Ver [`PENDENCIAS.md`](PENDENCIAS.md), seção 1: compliance do BTG e da Sacre, conferência do contador, teste no Safari e no Firefox.

## Outras hospedagens

O site funciona em qualquer hospedagem estática com HTTPS (Netlify, Vercel, Cloudflare Pages): comando de build `npm run build`, pasta publicada `dist`. A rotina de mercado continua no GitHub Actions e grava no repositório; a hospedagem só precisa publicar de novo a cada mudança.

## Rodar no próprio computador

Requer Node.js 20 ou mais novo.

```bash
npm install
```

```bash
npm run dev
```

Abre em <http://localhost:5173>.
