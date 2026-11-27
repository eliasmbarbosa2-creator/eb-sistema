// Textos das artes. **palavra** = destaque em azul. Edite aqui e rode gerar.mjs de novo.
export const POSTS = [
  {
    pasta: '01-apresentacao',
    slides: [
      { tipo: 'capa', logo: true, kicker: 'Prazer!', titulo: 'Somos a **EB**\nInstalações\nElétricas', tam: 118,
        sub: 'Projetos elétricos, quadros de comando e instalações feitas com segurança e dentro da norma.',
        tags: ['Residencial', 'Comercial', 'Industrial'] },
      { tipo: 'cards', kicker: 'O que fazemos', titulo: 'Do projeto à\n**execução**', tam: 100, cards: [
        { icone: 'prj', titulo: 'Projetos elétricos', texto: 'Dimensionamento, aumento de carga e documentação para a concessionária.' },
        { icone: 'qdc', titulo: 'Quadros de comando', texto: 'Montagem de painéis e partida de motores para comércio e indústria.' },
        { icone: 'ins', titulo: 'Instalações e reformas', texto: 'Troca de quadro, tomadas, chuveiros, iluminação e circuitos novos.' },
      ] },
      { tipo: 'cta', kicker: 'Por que a EB', titulo: 'Segurança\nem **primeiro lugar**',
        paras: ['Técnico em Eletrotécnica registrado no CFT, com **TRT** dos serviços, quadro organizado e identificado e orçamento **por escrito**, sem surpresas.'] },
    ],
  },
  {
    pasta: '02-como-funciona-o-atendimento',
    slides: [
      { tipo: 'capa', kicker: 'Atendimento', titulo: 'Como\nfunciona o\n**atendimento**', sub: 'Do primeiro contato ao serviço pronto, em 4 etapas simples.' },
      { tipo: 'etapa', n: 1, total: 4, icone: 'chat', titulo: 'Pedido', paras: ['Você conta o que precisa pelo **WhatsApp**, pelo **formulário do site** ou por mensagem aqui no Instagram.', 'Fotos do local e do quadro ajudam muito.'] },
      { tipo: 'etapa', n: 2, total: 4, icone: 'casa', titulo: 'Visita técnica', paras: ['No dia combinado, avalio a instalação, as cargas e o local.', 'Em serviços simples, dá para orçar **só pelas fotos**.'] },
      { tipo: 'etapa', n: 3, total: 4, icone: 'doc', titulo: 'Orçamento', paras: ['Você recebe a proposta em **PDF**, com materiais, mão de obra, prazo e forma de pagamento.', 'Pode aprovar **online**, pelo link da proposta.'] },
      { tipo: 'etapa', n: 4, total: 4, icone: 'ferramenta', titulo: 'Execução', paras: ['Serviço feito conforme a **NBR 5410**, com quadro identificado, teste final e local limpo.', 'Com **TRT** e garantia.'] },
      { tipo: 'cta', kicker: 'Vamos começar?', titulo: 'Peça o seu\n**orçamento**', paras: ['Retorno em até **1 dia útil** para combinar a visita.'] },
    ],
  },
  {
    pasta: '03-dicas-dr-no-quadro',
    slides: [
      { tipo: 'capa', kicker: 'Dica de segurança', titulo: 'O seu quadro\ntem **DR**?', sub: 'O dispositivo que protege as **pessoas** contra choque elétrico. Arraste e veja se a sua casa tem.' },
      { tipo: 'texto', icone: 'botao', kicker: 'O que é', titulo: 'Dispositivo\n**Diferencial Residual**', paras: ['O DR compara a corrente que **vai** com a que **volta** no circuito.', 'Se uma parte "escapa", por exemplo pelo corpo de alguém, ele **desliga em milésimos de segundo**.'] },
      { tipo: 'vs', kicker: 'Não confunda', titulo: 'Disjuntor **≠** DR', cards: [
        { icone: 'disj', titulo: 'Disjuntor', texto: 'Protege os **fios** contra sobrecarga e curto-circuito.' },
        { icone: 'pessoa', titulo: 'DR', texto: 'Protege as **pessoas** contra choque e fuga de corrente.' },
      ], rodape: 'Um **não substitui** o outro: a instalação segura tem os dois.' },
      { tipo: 'lista', kicker: 'NBR 5410', titulo: 'Onde o DR\né **obrigatório**', tam: 96, itens: [
        'Banheiros (circuitos do chuveiro e das tomadas)',
        'Cozinhas, copas, lavanderias e áreas de serviço',
        'Tomadas em áreas externas',
        'Garagens e áreas molhadas ou que são lavadas',
      ], aviso: 'A norma pede DR de **alta sensibilidade (30 mA)** nesses circuitos.' },
      { tipo: 'texto', icone: 'check', kicker: 'Faça você mesmo', titulo: 'Teste o DR\n**todo mês**', paras: ['Aperte o botão **"T"** (teste) do DR com a casa funcionando.', 'Ele tem que **desarmar na hora**. Depois é só religar.'], aviso: 'Não desarmou? O DR pode estar com defeito. Chame um eletricista.' },
      { tipo: 'texto', icone: 'alerta', kicker: 'Atenção', titulo: 'O DR desarma\n**sozinho**?', paras: ['**Nunca retire o DR** para "resolver".', 'O desarme avisa que há fuga de corrente: aparelho com defeito, umidade ou fio com a isolação danificada. O certo é **achar a causa**.'] },
      { tipo: 'cta', kicker: 'Seu quadro não tem DR?', titulo: 'Avaliamos e\n**instalamos**', paras: ['Verificação do quadro, instalação do DR e identificação dos circuitos.'] },
    ],
  },
  {
    pasta: '04-dicas-instalacao-sobrecarregada',
    slides: [
      { tipo: 'capa', kicker: 'Fique de olho', titulo: '**6 sinais** de\ninstalação\nsobrecarregada', sub: 'Se a sua casa ou comércio tem algum deles, está na hora de uma avaliação.' },
      { tipo: 'sinais', kicker: 'Sinais 1 e 2', itens: [
        { n: '01', titulo: 'Disjuntor desarmando', texto: 'Cai toda vez que liga o chuveiro, o micro-ondas ou o ar-condicionado.' },
        { n: '02', titulo: 'Tomada quente ou escurecida', texto: 'Plugue, tomada ou espelho morno, amarelado ou com marca de queimado.' },
      ] },
      { tipo: 'sinais', kicker: 'Sinais 3 e 4', itens: [
        { n: '03', titulo: 'Cheiro de queimado', texto: 'Cheiro de plástico derretido perto do quadro, das tomadas ou dos aparelhos.' },
        { n: '04', titulo: 'Luz que pisca ou enfraquece', texto: 'As lâmpadas oscilam quando um aparelho potente é ligado.' },
      ] },
      { tipo: 'sinais', kicker: 'Sinais 5 e 6', itens: [
        { n: '05', titulo: 'Benjamim e extensão fixos', texto: 'Vários aparelhos na mesma tomada, todos os dias.' },
        { n: '06', titulo: 'Fios quentes ou ressecados', texto: 'Cabos aquecidos, com a capa endurecida ou cheios de emendas.' },
      ] },
      { tipo: 'lista', x: true, kicker: 'O que NÃO fazer', titulo: 'Erros que\n**pioram** o problema', tam: 96, itens: [
        'Trocar o disjuntor por um **maior**: o disjuntor protege o fio, e o fio continua o mesmo',
        'Ligar mais aparelhos em **benjamins** e extensões',
        'Ignorar o cheiro de queimado ou a tomada quente',
      ], aviso: 'Sobrecarga é uma das principais causas de **incêndio** de origem elétrica.' },
      { tipo: 'cta', kicker: 'Reconheceu algum sinal?', titulo: 'Faça uma\n**avaliação**', paras: ['Verificamos circuitos, cabos e disjuntores e indicamos a solução certa: divisão de circuitos, troca de cabos ou aumento de carga.'] },
    ],
  },
  {
    pasta: '05-dicas-o-que-e-trt',
    slides: [
      { tipo: 'capa', kicker: 'Você sabia?', titulo: 'O que é\n**TRT**?', sub: 'E por que você deve pedir no seu serviço elétrico.' },
      { tipo: 'texto', icone: 'doc', kicker: 'Significado', titulo: 'Termo de\nResponsabilidade\n**Técnica**', paras: ['É o documento em que o técnico **registrado no CFT** assume oficialmente a responsabilidade pelo projeto ou serviço.', 'Fica registrado **quem fez, o quê e onde**.'] },
      { tipo: 'vs', kicker: 'É como a ART', titulo: 'TRT × **ART**', cards: [
        { icone: 'badge', titulo: 'TRT', texto: 'Emitida pelo **técnico industrial**, no Sistema CFT/CRTs.' },
        { icone: 'badge', titulo: 'ART', texto: 'Emitida pelo **engenheiro**, no Sistema Confea/Crea.' },
      ], rodape: 'A finalidade é a mesma: **registrar o responsável técnico** pelo serviço.' },
      { tipo: 'lista', kicker: 'Quando pedir', titulo: 'Quando a TRT\n**faz diferença**', tam: 96, itens: [
        'Projetos elétricos e aumento de carga',
        'Montagem de quadros e painéis de comando',
        'Laudos, vistorias e manutenções',
        'Quando a **concessionária, prefeitura, condomínio ou seguradora** pedem',
      ] },
      { tipo: 'cta', kicker: 'Na EB é assim', titulo: 'Serviço com\n**responsabilidade**', paras: ['Emitimos a **TRT** dos projetos e serviços executados. Você sabe exatamente quem responde pelo trabalho.'] },
    ],
  },
  {
    pasta: '06-modelo-antes-e-depois',
    slides: [
      { tipo: 'lado', titulo: 'Troca de **quadro**', texto: 'Residência · circuitos separados, DR e identificação', local: 'Cidade – UF' },
      { tipo: 'foto', arquivo: 'antes.jpg', selo: 'antes', titulo: 'Como estava', texto: 'Fios soltos, sem DR e sem identificação dos circuitos.' },
      { tipo: 'foto', arquivo: 'depois.jpg', selo: 'depois', titulo: 'Como ficou', texto: 'Quadro novo, organizado, com DR, DPS e circuitos etiquetados.' },
      { tipo: 'lista', kicker: 'O que foi feito', titulo: 'Serviço\n**executado**', tam: 96, itens: [
        'Substituição do quadro de distribuição',
        'Instalação de DR e DPS',
        'Divisão e identificação dos circuitos',
        'Teste final e emissão da TRT',
      ] },
      { tipo: 'cta', kicker: 'Quer o mesmo na sua casa?', titulo: 'Peça o seu\n**orçamento**' },
    ],
  },
  {
    // Molduras com a área da foto transparente: para montar no Canva com fotos novas.
    pasta: '07-molduras-antes-e-depois',
    slides: [
      { tipo: 'foto', recorte: true, arquivo: '_', selo: 'antes', titulo: '', texto: '', local: 'Cidade – UF' },
      { tipo: 'foto', recorte: true, arquivo: '_', selo: 'depois', titulo: '', texto: '', local: 'Cidade – UF' },
    ],
  },
];

export const DESTAQUES = [
  { arquivo: 'destaque-trabalhos', icone: 'camera' },
  { arquivo: 'destaque-quadros-de-comando', icone: 'qdc' },
  { arquivo: 'destaque-dicas', icone: 'lampada' },
  { arquivo: 'destaque-orcamento', icone: 'doc' },
];
