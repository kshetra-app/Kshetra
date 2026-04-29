import type { PartyCode } from '../types/constituency';

export interface PartyInfo {
  code: PartyCode;
  name: string;
  shortName: string;
  color: string;
  secondaryColor: string;
}

export const PARTY_CONFIG: Record<PartyCode, PartyInfo> = {
  BJP: {
    code: 'BJP',
    name: 'Bharatiya Janata Party',
    shortName: 'BJP',
    color: '#FF6B00',
    secondaryColor: '#FF9A45',
  },
  INC: {
    code: 'INC',
    name: 'Indian National Congress',
    shortName: 'Congress',
    color: '#19AAED',
    secondaryColor: '#5DC4F5',
  },
  BRS: {
    code: 'BRS',
    name: 'Bharat Rashtra Samithi',
    shortName: 'BRS',
    color: '#E91E7B',
    secondaryColor: '#F06DAB',
  },
  TDP: {
    code: 'TDP',
    name: 'Telugu Desam Party',
    shortName: 'TDP',
    color: '#FFCD00',
    secondaryColor: '#FFE066',
  },
  AIMIM: {
    code: 'AIMIM',
    name: 'All India Majlis-e-Ittehadul Muslimeen',
    shortName: 'AIMIM',
    color: '#008000',
    secondaryColor: '#33B333',
  },
  YSRCP: {
    code: 'YSRCP',
    name: 'YSR Congress Party',
    shortName: 'YSRCP',
    color: '#0066CC',
    secondaryColor: '#4D99E6',
  },
  AAP: {
    code: 'AAP',
    name: 'Aam Aadmi Party',
    shortName: 'AAP',
    color: '#0080DD',
    secondaryColor: '#45A3E8',
  },
  DMK: {
    code: 'DMK',
    name: 'Dravida Munnetra Kazhagam',
    shortName: 'DMK',
    color: '#E30613',
    secondaryColor: '#F04D57',
  },
  AITC: {
    code: 'AITC',
    name: 'All India Trinamool Congress',
    shortName: 'TMC',
    color: '#20C646',
    secondaryColor: '#5DD97A',
  },
  CPI: {
    code: 'CPI',
    name: 'Communist Party of India',
    shortName: 'CPI',
    color: '#CC0000',
    secondaryColor: '#E64D4D',
  },
  CPIM: {
    code: 'CPIM',
    name: 'Communist Party of India (Marxist)',
    shortName: 'CPI(M)',
    color: '#CC0000',
    secondaryColor: '#E64D4D',
  },
  NCP: {
    code: 'NCP',
    name: 'Nationalist Congress Party',
    shortName: 'NCP',
    color: '#00BFFF',
    secondaryColor: '#4DD4FF',
  },
  SHS: {
    code: 'SHS',
    name: 'Shiv Sena',
    shortName: 'SHS',
    color: '#FF6600',
    secondaryColor: '#FF944D',
  },
  JDU: {
    code: 'JDU',
    name: 'Janata Dal (United)',
    shortName: 'JD(U)',
    color: '#006400',
    secondaryColor: '#009700',
  },
  RJD: {
    code: 'RJD',
    name: 'Rashtriya Janata Dal',
    shortName: 'RJD',
    color: '#008000',
    secondaryColor: '#33B333',
  },
  BSP: {
    code: 'BSP',
    name: 'Bahujan Samaj Party',
    shortName: 'BSP',
    color: '#22409A',
    secondaryColor: '#4D6BC4',
  },
  SP: {
    code: 'SP',
    name: 'Samajwadi Party',
    shortName: 'SP',
    color: '#FF2222',
    secondaryColor: '#FF6666',
  },
  JSP: {
    code: 'JSP',
    name: 'Jana Sena Party',
    shortName: 'JSP',
    color: '#FF0000',
    secondaryColor: '#FF4D4D',
  },
  JDS: {
    code: 'JDS',
    name: 'Janata Dal (Secular)',
    shortName: 'JD(S)',
    color: '#006633',
    secondaryColor: '#009944',
  },
  JMM: {
    code: 'JMM',
    name: 'Jharkhand Mukti Morcha',
    shortName: 'JMM',
    color: '#2E8B57',
    secondaryColor: '#5CB88A',
  },
  JKNC: {
    code: 'JKNC',
    name: 'Jammu & Kashmir National Conference',
    shortName: 'JKNC',
    color: '#FF0000',
    secondaryColor: '#FF4D4D',
  },
  SHSUBT: {
    code: 'SHSUBT',
    name: 'Shiv Sena (Uddhav Balasaheb Thackeray)',
    shortName: 'SHS(UBT)',
    color: '#FF6600',
    secondaryColor: '#FF944D',
  },
  NCPSP: {
    code: 'NCPSP',
    name: 'Nationalist Congress Party (Sharad Pawar)',
    shortName: 'NCP(SP)',
    color: '#00BFFF',
    secondaryColor: '#4DD4FF',
  },
  NOTA: {
    code: 'NOTA',
    name: 'None of the Above',
    shortName: 'NOTA',
    color: '#808080',
    secondaryColor: '#A6A6A6',
  },
  IND: {
    code: 'IND',
    name: 'Independent',
    shortName: 'IND',
    color: '#999999',
    secondaryColor: '#BFBFBF',
  },
  OTH: {
    code: 'OTH',
    name: 'Other',
    shortName: 'Other',
    color: '#666666',
    secondaryColor: '#999999',
  },
};

export const getPartyColor = (party: PartyCode): string =>
  PARTY_CONFIG[party]?.color ?? '#666666';

export const getPartyName = (party: PartyCode): string =>
  PARTY_CONFIG[party]?.shortName ?? party;
