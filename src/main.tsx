import '@fontsource/gelasio/latin-400.css';
import '@fontsource/gelasio/latin-500.css';
import '@fontsource/gelasio/latin-600.css';
import '@fontsource/gelasio/latin-700.css';
import '@fontsource/source-sans-3/latin-400.css';
import '@fontsource/source-sans-3/latin-500.css';
import '@fontsource/source-sans-3/latin-600.css';
import '@fontsource/source-sans-3/latin-700.css';
import './estilo/app.css';
import './estilo/extra.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import { carregaDados } from './ui/dados';

const raiz = createRoot(document.getElementById('raiz')!);
raiz.render(<div className="carregando">Carregando regras e dados de mercado…</div>);
carregaDados()
  .then((dados) =>
    raiz.render(
      <StrictMode>
        <App dados={dados} />
      </StrictMode>,
    ),
  )
  .catch((erro: unknown) =>
    raiz.render(
      <div className="carregando" role="alert">
        Não foi possível carregar os dados do simulador.
        <br />
        <small>{erro instanceof Error ? erro.message : String(erro)}</small>
      </div>,
    ),
  );
