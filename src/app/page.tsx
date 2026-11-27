import { carregarSitePublico, carregarPortfolio } from '@/lib/dados-publicos';
import SitePublico from '@/components/SitePublico';

// O site é gerado de novo no máximo a cada 5 minutos, ou na hora quando você publica uma alteração.
export const revalidate = 300;

export default async function Inicio() {
  const [{ empresa, conteudo }, trabalhos] = await Promise.all([carregarSitePublico(), carregarPortfolio()]);
  return <SitePublico empresa={empresa} conteudo={conteudo} trabalhos={trabalhos} />;
}
