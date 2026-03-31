export const VERBS = [
  {
    language: 'it',
    id: 'avere',
    name: 'Avere',
    group: 'ere',
    irregular: true,
    auxiliary: 'avere',
    reflexive: false,
    tenses: {
      presente: ['ho', 'hai', 'ha', 'abbiamo', 'avete', 'hanno'],
      passatoProssimo: [
        'ho avuto',
        'hai avuto',
        'ha avuto',
        'abbiamo avuto',
        'avete avuto',
        'hanno avuto',
      ],
    },
  },
  {
    language: 'it',
    id: 'essere',
    name: 'Essere',
    group: 'ere',
    irregular: true,
    auxiliary: 'essere',
    reflexive: false,
    tenses: {
      presente: ['sono', 'sei', 'è', 'siamo', 'siete', 'sono'],
      passatoProssimo: [
        ['sono stato', 'sono stata'],
        ['sei stato', 'sei stata'],
        ['è stato', 'è stata'],
        ['siamo stati', 'siamo state'],
        ['siete stati', 'siete state'],
        ['sono stati', 'sono state'],
      ],
    },
  },
];

export const TENSE_LABELS = {
  presente: 'Presente',
  passatoProssimo: 'Passato Prossimo',
};

export const TENSE_KEYS = Object.keys(TENSE_LABELS);
