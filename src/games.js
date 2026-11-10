// Configuração central dos jogos. Para trocar a imagem de um botão,
// coloque o arquivo em public/img/ e ajuste o caminho abaixo.
const GAMES = {
  cs16: {
    slug: 'cs16', name: 'CS 1.6', type: 'team',
    image: '/img/cs16.png',
    tagline: 'Equipes de 5 jogadores · limite de 8 equipes',
    maxTeams: 8,
    sections: ['Equipes', 'Inscrição', 'Gerenciar integrantes'],
  },
  mk1: {
    slug: 'mk1', name: 'Mortal Kombat 1', type: 'solo',
    image: '/img/mk1.png',
    tagline: 'Inscrição individual',
    sections: ['Inscrição', 'Participantes', 'Confrontos'],
  },
  fifa26: {
    slug: 'fifa26', name: 'FIFA 26', type: 'solo',
    image: '/img/fifa26.png',
    tagline: 'Inscrição individual',
    sections: ['Inscrição', 'Participantes', 'Confrontos'],
  },
};

module.exports = { GAMES };
