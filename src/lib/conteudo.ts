// Textos padrão do site. O que for salvo em "Conteúdo do site" substitui estes valores.
export type Item = { icone?: string; titulo?: string; texto?: string };
export type Servico = { icone: string; titulo: string; nome: string; texto: string; itens: string[] };
export type ConteudoSite = {
  heroTitulo: string; heroTexto: string;
  garantias: { icone: string; texto: string }[];
  servicosTitulo: string; servicosTexto: string; servicos: Servico[];
  segmentos: { icone: string; titulo: string; texto: string }[];
  trabalhosTitulo: string;
  difTitulo: string; diferenciais: { icone: string; titulo: string; texto: string }[];
  etapasTitulo: string; etapas: { titulo: string; texto: string }[];
  faqTitulo: string; faqTexto: string; faq: { pergunta: string; resposta: string }[];
  contatoTitulo: string; contatoTexto: string; contatoDica: string;
};

export const CONTEUDO_PADRAO: ConteudoSite = 
{
  "heroTitulo": "Projetos, quadros de comando e instalações elétricas feitos dentro da norma",
  "heroTexto": "Técnico em eletrotécnica com atuação em projetos elétricos, montagem de quadros de comando e instalações residenciais, comerciais e industriais.",
  "garantias": [
    {
      "icone": "shield",
      "texto": "Instalações conforme a NBR 5410"
    },
    {
      "icone": "badge",
      "texto": "TRT emitida no CFT"
    },
    {
      "icone": "clock",
      "texto": "Garantia de 90 dias na mão de obra"
    },
    {
      "icone": "doc",
      "texto": "Orçamento detalhado por escrito"
    }
  ],
  "servicosTitulo": "O que a EB faz",
  "servicosTexto": "Atendimento com visita técnica para avaliar a instalação antes do orçamento.",
  "servicos": [
    {
      "icone": "prj",
      "titulo": "Projetos elétricos",
      "nome": "Projeto elétrico",
      "texto": "Projeto completo para aprovação na concessionária e para a execução, com responsabilidade técnica.",
      "itens": [
        "Residencial, comercial e predial",
        "Quadro de cargas e divisão de circuitos (NBR 5410)",
        "Diagrama unifilar, memorial e TRT"
      ]
    },
    {
      "icone": "qdc",
      "titulo": "Quadros de comando",
      "nome": "Quadro de comando",
      "texto": "Painéis montados sob medida, com fiação identificada e testados antes da entrega.",
      "itens": [
        "Partida direta, estrela-triângulo e soft-starter",
        "Comando de bombas com alternância e boia",
        "Contatores, relés, CLP e sinalização"
      ]
    },
    {
      "icone": "ins",
      "titulo": "Instalações elétricas",
      "nome": "Instalação elétrica",
      "texto": "Instalação nova, reforma e adequação de instalações antigas, com segurança e acabamento.",
      "itens": [
        "Troca de quadro com DR e DPS",
        "Padrão de entrada e aterramento",
        "Ampliação de carga e balanceamento de fases"
      ]
    }
  ],
  "segmentos": [
    {
      "icone": "home",
      "titulo": "Residencial",
      "texto": "Casas e apartamentos: troca de quadro, chuveiros, tomadas, iluminação e reformas."
    },
    {
      "icone": "shop",
      "titulo": "Comercial",
      "texto": "Lojas, clínicas, padarias e escritórios: aumento de carga, circuitos trifásicos e iluminação."
    },
    {
      "icone": "fab",
      "titulo": "Industrial",
      "texto": "Galpões e indústrias: partida de motores, painéis de comando e manutenção."
    }
  ],
  "trabalhosTitulo": "Trabalhos realizados",
  "difTitulo": "Por que contratar a EB",
  "diferenciais": [
    {
      "icone": "shield",
      "titulo": "Segurança em primeiro lugar",
      "texto": "Cabos e disjuntores dimensionados para a carga real, com DR, DPS e aterramento."
    },
    {
      "icone": "list",
      "titulo": "Quadro organizado e identificado",
      "texto": "Cada circuito etiquetado: você sabe exatamente o que cada disjuntor desliga."
    },
    {
      "icone": "doc",
      "titulo": "Orçamento sem surpresas",
      "texto": "Materiais, mão de obra, prazo e pagamento descritos por escrito antes de começar."
    },
    {
      "icone": "badge",
      "titulo": "Responsabilidade técnica",
      "texto": "Profissional técnico registrado no CFT, com TRT dos serviços executados."
    }
  ],
  "etapasTitulo": "Como funciona",
  "etapas": [
    {
      "titulo": "Pedido",
      "texto": "Você descreve o serviço pelo formulário ou pelo WhatsApp."
    },
    {
      "titulo": "Visita técnica",
      "texto": "Avalio a instalação, as cargas e o local no dia combinado."
    },
    {
      "titulo": "Orçamento",
      "texto": "Você recebe a proposta em PDF com materiais, mão de obra, prazo e pagamento."
    },
    {
      "titulo": "Execução",
      "texto": "Serviço feito conforme a NBR 5410, com TRT e garantia."
    }
  ],
  "faqTitulo": "Perguntas que os clientes sempre fazem",
  "faqTexto": "Não achou a sua? Mande pelo WhatsApp.",
  "faq": [
    {
      "pergunta": "A EB emite TRT?",
      "resposta": "Sim. Como técnico em eletrotécnica registrado no CFT, emito a TRT (Termo de Responsabilidade Técnica) dos projetos e serviços. Ela é pedida por concessionárias, condomínios e prefeituras."
    },
    {
      "pergunta": "Preciso de projeto para aumentar a carga ou trocar o padrão?",
      "resposta": "Na maioria das concessionárias, o aumento de carga e a mudança de monofásico para bifásico ou trifásico exigem solicitação formal e, conforme a potência, projeto elétrico. Na visita técnica eu verifico o que a sua concessionária exige."
    },
    {
      "pergunta": "O que é DR e por que preciso dele?",
      "resposta": "O DR desliga o circuito quando detecta fuga de corrente, protegendo as pessoas contra choque elétrico. A NBR 5410 exige DR nos circuitos de banheiros, cozinhas, áreas de serviço e áreas externas."
    },
    {
      "pergunta": "Quanto tempo leva a troca de um quadro?",
      "resposta": "Em uma residência, normalmente um dia de trabalho, com a energia desligada durante parte do serviço. O prazo exato vai escrito no orçamento."
    },
    {
      "pergunta": "Como recebo o orçamento?",
      "resposta": "Depois da visita, você recebe a proposta em PDF pelo WhatsApp ou e-mail, com cada material, a mão de obra, o prazo e as condições de pagamento."
    }
  ],
  "contatoTitulo": "Solicitar orçamento",
  "contatoTexto": "Preencha o formulário e eu retorno em até 1 dia útil para combinar a visita técnica.",
  "contatoDica": "Dica: para quadros de comando, envie fotos do local e os dados dos motores (cv e tensão)."
};

export function mesclarConteudo(salvo: unknown): ConteudoSite {
  const s = (salvo && typeof salvo === 'object' ? salvo : {}) as Partial<ConteudoSite>;
  return { ...CONTEUDO_PADRAO, ...s };
}
