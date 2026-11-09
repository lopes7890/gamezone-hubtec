// Regulamentos exibidos na aba de inscrição de cada jogo.
const CONDUTA_SOLO = { title: '3. Conduta dos participantes', items: [
  'Todos os jogadores deverão respeitar os adversários e os organizadores.',
  'Não serão tolerados insultos, provocações ofensivas, discriminação ou atitudes antidesportivas.',
  'Os participantes deverão seguir as orientações da organização.',
] };
const PONTUALIDADE_SOLO = { title: '4. Pontualidade', items: [
  'Os jogadores deverão comparecer no horário definido para seus confrontos.',
  'O atraso poderá resultar em derrota por W.O., conforme decisão da organização.',
  'Caso um participante não compareça, será considerado derrotado no confronto.',
] };
const PENALIDADES_SOLO = { title: '5. Penalidades', items: [
  'O descumprimento das regras poderá resultar em advertência ou desclassificação.',
  'Qualquer tentativa de obter vantagem indevida poderá resultar na eliminação do participante.',
  'Problemas técnicos serão avaliados pela organização.',
] };
const FINAIS_SOLO = { title: '6. Disposições finais', items: [
  'Ao realizar a inscrição, o participante declara estar de acordo com este regulamento.',
  'Os casos não previstos serão avaliados e decididos pela organização.',
  'As decisões da organização deverão ser respeitadas por todos os participantes.',
] };

module.exports = {
  mk1: {
    title: 'REGULAMENTO – COMPETIÇÃO DE MORTAL KOMBAT 1',
    sections: [
      { title: '1. Inscrição e participação', items: [
        'Cada participante deverá realizar sua inscrição individualmente.',
        'Cada jogador poderá realizar apenas uma inscrição por edição do campeonato.',
        'É permitida a participação em diferentes edições do campeonato, mesmo que o jogador já tenha participado de competições anteriores.',
        'Todos os participantes deverão estar presentes no horário estabelecido pela organização.',
      ] },
      { title: '2. Regras das partidas', items: [
        'As partidas serão realizadas no jogo Mortal Kombat 1.',
        'O formato da competição será definido pela organização, conforme o número de inscritos.',
        'Cada confronto será disputado entre dois jogadores.',
        'As partidas serão realizadas em melhor de 3 lutas (vence quem ganhar 2 lutas).',
        'A escolha dos personagens será livre.',
        'Não será permitido utilizar recursos externos, modificações ou qualquer artifício que proporcione vantagem indevida.',
      ] },
      CONDUTA_SOLO, PONTUALIDADE_SOLO, PENALIDADES_SOLO, FINAIS_SOLO,
    ],
  },
  fifa26: {
    title: 'REGULAMENTO – COMPETIÇÃO DE EA SPORTS FC 26',
    sections: [
      { title: '1. Inscrição e participação', items: [
        'Cada participante deverá realizar sua inscrição individualmente.',
        'Cada jogador poderá realizar apenas uma inscrição por edição do campeonato.',
        'É permitida a participação em diferentes edições do campeonato.',
        'Todos os participantes deverão estar presentes no horário estabelecido pela organização.',
      ] },
      { title: '2. Regras das partidas', items: [
        'As partidas serão realizadas no EA SPORTS FC 26.',
        'Cada confronto será disputado entre dois jogadores.',
        'O formato da competição será definido pela organização, conforme o número de inscritos.',
        'A duração das partidas será definida previamente pela organização.',
        'Cada jogador poderá escolher livremente seu time ou seleção, respeitando as configurações estabelecidas.',
        'Não será permitido utilizar modificações ou recursos externos que proporcionem vantagens indevidas.',
      ] },
      CONDUTA_SOLO, PONTUALIDADE_SOLO, PENALIDADES_SOLO, FINAIS_SOLO,
    ],
  },
  cs16: {
    title: 'REGULAMENTO – COMPETIÇÃO DE COUNTER-STRIKE 1.6',
    sections: [
      { title: '1. Formação das equipes', items: [
        'Cada equipe deverá ser composta por 5 jogadores titulares, todos alunos matriculados na Fatec Registro.',
        'Cada equipe deverá indicar um capitão responsável pela comunicação com a organização.',
        'Não será permitida a participação de jogadores em mais de uma equipe.',
        'Todos os participantes deverão estar inscritos antes do início da competição.',
      ] },
      { title: '2. Regras das partidas', items: [
        'As partidas serão realizadas no Counter-Strike 1.6.',
        'O formato das partidas será definido pela organização, de acordo com o número de equipes inscritas.',
        'Cada partida será disputada entre duas equipes, com 5 jogadores de cada lado.',
        'Os mapas serão definidos previamente pela organização.',
        'É proibido utilizar cheats, scripts, bugs ou qualquer recurso que ofereça vantagem indevida.',
      ] },
      { title: '3. Conduta dos participantes', items: [
        'Todos os jogadores deverão manter o respeito com adversários, organizadores e demais participantes.',
        'Não serão tolerados xingamentos, provocações ofensivas, discriminação ou atitudes antidesportivas.',
        'Os jogadores deverão seguir as orientações da organização durante toda a competição.',
      ] },
      { title: '4. Pontualidade e participação', items: [
        'As equipes deverão comparecer no horário estabelecido.',
        'O atraso poderá resultar em derrota por W.O., conforme decisão da organização.',
        'A ausência de jogadores deverá ser comunicada imediatamente ao responsável pela competição.',
      ] },
      { title: '5. Penalidades', items: [
        'O descumprimento das regras poderá resultar em advertência, perda da partida ou desclassificação.',
        'O uso de trapaças resultará na desclassificação imediata da equipe.',
        'A organização será responsável por avaliar ocorrências e aplicar as penalidades necessárias.',
      ] },
      { title: '6. Disposições finais', items: [
        'Ao realizar a inscrição, todos os participantes declaram estar de acordo com este regulamento.',
        'Os casos não previstos neste documento serão avaliados e resolvidos pela organização.',
        'As decisões da organização deverão ser respeitadas por todos os participantes.',
      ] },
    ],
  },
};
