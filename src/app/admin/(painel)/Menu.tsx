'use client';
import { usePathname } from 'next/navigation';

const ITENS: { href: string; rotulo: string; pronto: boolean }[] = [
  { href: '/admin', rotulo: 'Painel', pronto: true },
  { href: '/admin/clientes', rotulo: 'Clientes', pronto: true },
  { href: '/admin/orcamentos', rotulo: 'Orçamentos', pronto: true },
  { href: '/admin/servicos', rotulo: 'Serviços', pronto: true },
  { href: '/admin/financeiro', rotulo: 'Financeiro', pronto: true },
  { href: '/admin/estoque', rotulo: 'Estoque', pronto: true },
  { href: '/admin/conteudo', rotulo: 'Conteúdo do site', pronto: false },
  { href: '/admin/portfolio', rotulo: 'Portfólio', pronto: true },
  { href: '/admin/empresa', rotulo: 'Dados da empresa', pronto: true },
];

export default function Menu({ novos, atrasadas, baixo }: { novos: number; atrasadas: number; baixo: number }) {
  const badge: Record<string, [number, string]> = { '/admin/clientes': [novos, ''], '/admin/financeiro': [atrasadas, 'bad'], '/admin/estoque': [baixo, 'bad'] };
  const atual = usePathname();
  return (
    <nav aria-label="Módulos">
      {ITENS.map((i, n) => (
        <span key={i.href} style={{ display: 'contents' }}>
          {n === 6 && <div className="sep" />}
          {i.pronto ? (
            <a href={i.href} className={(i.href === '/admin' ? atual === i.href : atual.startsWith(i.href)) ? 'on' : ''}>
              <span>{i.rotulo}</span>
              {badge[i.href]?.[0] > 0 && <span className={`badge ${badge[i.href][1]}`}>{badge[i.href][0]}</span>}
            </a>
          ) : (
            <a aria-disabled="true" className="soon" title="Chega na próxima etapa"><span>{i.rotulo}</span><span className="pill t-mute">em breve</span></a>
          )}
        </span>
      ))}
    </nav>
  );
}
