// Gera o QR code do link do simulador para a versão impressa do e-book.
// Uso: node scripts/gerar-qrcode.mjs https://usuario.github.io/simulador-sacre-brasil-eua/
// Saída: docs/publicacao/qrcode.svg (vetor, para a gráfica) e docs/publicacao/qrcode.png (1200 px).
import { mkdirSync } from 'node:fs';
import QRCode from 'qrcode';

const url = process.argv[2];
if (!url || !/^https:\/\/[^\s?#]+$/.test(url)) {
  console.error('Informe o link completo, com https:// e sem parâmetros. Ex.: node scripts/gerar-qrcode.mjs https://usuario.github.io/simulador-sacre-brasil-eua/');
  process.exit(1);
}

const pasta = 'docs/publicacao';
mkdirSync(pasta, { recursive: true });
// Correção de erro alta (H): o código continua legível mesmo com impressão imperfeita.
const opcoes = { errorCorrectionLevel: 'H', margin: 4, color: { dark: '#173232', light: '#FFFFFF' } };
await QRCode.toFile(`${pasta}/qrcode.svg`, url, { ...opcoes, type: 'svg' });
await QRCode.toFile(`${pasta}/qrcode.png`, url, { ...opcoes, type: 'png', width: 1200 });
console.log(`QR code gerado para ${url} em ${pasta}/qrcode.svg e ${pasta}/qrcode.png`);
