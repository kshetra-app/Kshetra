/**
 * Meghalaya — Previous Election Results (2018)
 *
 * SOURCE: TCPD "Lok Dhaba" / Election Commission of India (ECI),
 *         Official Legislative Assembly General Election 2018.
 *         Full per-constituency winner + party, official AC numbering 1-60.
 *         Authored under CTO Directive 137 / CRIT-F02-02.
 */

export interface MLHistoricalResult {
  acNo: number;
  name: string;
  winner: string;
  party: string;
  year?: number;
  votes?: number;
  margin?: number;
  runnerUp?: string;
}

export const ML_2018_RESULTS: MLHistoricalResult[] = [
  { acNo: 1, name: 'Nartiang', winner: 'Sniawbhalang Dhar', party: 'NPEP', year: 2018, votes: 16604, margin: 2098, runnerUp: 'Jopthiaw Lyngdoh' },
  { acNo: 2, name: 'Jowai', winner: 'Wailadmiki Shylla', party: 'NPEP', year: 2018, votes: 10657, margin: 1303, runnerUp: 'Moonlight Pariat' },
  { acNo: 3, name: 'Raliang', winner: 'Comingone Ymbon', party: 'NPEP', year: 2018, votes: 12129, margin: 3250, runnerUp: 'Lakhon Biam' },
  { acNo: 4, name: 'Mowkaiaw', winner: 'Nujorki Sungoh', party: 'UDP', year: 2018, votes: 6691, margin: 260, runnerUp: 'Gilbert Sten' },
  { acNo: 5, name: 'Sutnga Saipung', winner: 'Shitlang Pale', party: 'INC', year: 2018, votes: 12257, margin: 1584, runnerUp: 'Hopeful Bamon' },
  { acNo: 6, name: 'Khliehriat', winner: 'Kyrmen Shylla', party: 'UDP', year: 2018, votes: 20285, margin: 8181, runnerUp: 'Justine Dkhar' },
  { acNo: 7, name: 'Amlarem', winner: 'Lahkmen Rymbui', party: 'UDP', year: 2018, votes: 14766, margin: 2631, runnerUp: 'Stephanson Mukhim' },
  { acNo: 8, name: 'Mawhati', winner: 'Dasakhiatbha Lamare', party: 'NPEP', year: 2018, votes: 6365, margin: 204, runnerUp: 'Julias Kitbok Dorphang' },
  { acNo: 9, name: 'Nongpoh', winner: 'Mayralborn Syiem', party: 'INC', year: 2018, votes: 11119, margin: 3324, runnerUp: 'Rona Khymdeit' },
  { acNo: 10, name: 'Jirang', winner: 'Sosthenes Sohtun', party: 'NPEP', year: 2018, votes: 9437, margin: 220, runnerUp: 'Witness Day Sancley' },
  { acNo: 11, name: 'Umsning', winner: 'Jason Sawkmie Mawlong', party: 'PDF', year: 2018, votes: 9238, margin: 70, runnerUp: 'Celestine Lyngdoh' },
  { acNo: 12, name: 'Umroi', winner: 'George Bankyntiewlang Lyngdoh', party: 'INC', year: 2018, votes: 10405, margin: 1018, runnerUp: 'Ngaitlang Dhar' },
  { acNo: 13, name: 'Mawryngkneng', winner: 'David A Nongrum', party: 'INC', year: 2018, votes: 10336, margin: 3763, runnerUp: 'Highlander Kharmalki' },
  { acNo: 14, name: 'Pynthorumkhrah', winner: 'Alexander Laloo Hek', party: 'BJP', year: 2018, votes: 10166, margin: 1418, runnerUp: 'James Ban Basaiawmoit' },
  { acNo: 15, name: 'Mawlai', winner: 'Process T. Sawkmie', party: 'INC', year: 2018, votes: 9253, margin: 1574, runnerUp: 'Teiborlang Pathaw' },
  { acNo: 16, name: 'East Shillong', winner: 'Mazel Ampareen Lyngdoh', party: 'INC', year: 2018, votes: 10368, margin: 6074, runnerUp: 'Neil Antonio War' },
  { acNo: 17, name: 'North Shillong', winner: 'Adelbert Nongrum', party: 'KHNAM', year: 2018, votes: 5572, margin: 406, runnerUp: 'J. Antonius Lyngdoh' },
  { acNo: 18, name: 'West Shillong', winner: 'Mohendro Rapsang', party: 'INC', year: 2018, votes: 10288, margin: 1984, runnerUp: 'Paul Lyngdoh' },
  { acNo: 19, name: 'South Shillong', winner: 'Sanbor Shullai', party: 'BJP', year: 2018, votes: 11204, margin: 5097, runnerUp: 'Manas Chaudhuri' },
  { acNo: 20, name: 'Mylliem', winner: 'Hamletson Dohling', party: 'PDF', year: 2018, votes: 8493, margin: 465, runnerUp: 'Ronnie V Lyngdoh' },
  { acNo: 21, name: 'Nongthymmai', winner: 'Charles Pyngrope', party: 'INC', year: 2018, votes: 10225, margin: 957, runnerUp: 'Dr. Jemino Mawthoh' },
  { acNo: 22, name: 'Nongkrem', winner: 'Lambor Malngiang', party: 'IND', year: 2018, votes: 8274, margin: 76, runnerUp: 'Ardent Miller Basaiawmoit' },
  { acNo: 23, name: 'Sohiong', winner: 'Samlin Malngiang', party: 'HSPDP', year: 2018, votes: 11960, margin: 622, runnerUp: 'H. Donkupar R. Lyngdoh' },
  { acNo: 24, name: 'Mawphlang', winner: 'Syntar Klas Sunn', party: 'IND', year: 2018, votes: 11162, margin: 718, runnerUp: 'Kennedy Cornelius Khyriem' },
  { acNo: 25, name: 'Mawsynram', winner: 'Himalaya Muktan Shangpliang', party: 'INC', year: 2018, votes: 8984, margin: 794, runnerUp: 'Pynshngainlang Syiem' },
  { acNo: 26, name: 'Shella', winner: 'Donkupar Roy', party: 'UDP', year: 2018, votes: 8280, margin: 370, runnerUp: 'Leston Wanswett' },
  { acNo: 27, name: 'Pynursla', winner: 'Prestone Tynsong', party: 'NPEP', year: 2018, votes: 12807, margin: 2574, runnerUp: 'Nehru Suting' },
  { acNo: 28, name: 'Sohra', winner: 'Gavin Miguel Mylliem', party: 'PDF', year: 2018, votes: 8625, margin: 2024, runnerUp: 'Titosstar Well Chyne' },
  { acNo: 29, name: 'Mawkynrew', winner: 'Banteidor Lyngdoh', party: 'PDF', year: 2018, votes: 8519, margin: 509, runnerUp: 'Martle N Mukhim' },
  { acNo: 30, name: 'Mairang', winner: 'Metbah Lyngdoh', party: 'UDP', year: 2018, votes: 10710, margin: 2914, runnerUp: 'Councellor Singh Wahlang' },
  { acNo: 31, name: 'Mawthadraishan', winner: 'Brolding Nongsiej', party: 'UDP', year: 2018, votes: 13520, margin: 1829, runnerUp: 'Biolinda L.Nonglait' },
  { acNo: 32, name: 'Nongstoin', winner: 'Macmillan Byrsat', party: 'NPEP', year: 2018, votes: 9284, margin: 60, runnerUp: 'Gabriel Wahlang' },
  { acNo: 33, name: 'Rambrai Jyrngam', winner: 'Kimfa Sidney Marbaniang', party: 'INC', year: 2018, votes: 12135, margin: 3803, runnerUp: 'K Phlastingwell Pangniang' },
  { acNo: 34, name: 'Mawshynrut', winner: 'Gigur Myrthong', party: 'NPEP', year: 2018, votes: 9540, margin: 3424, runnerUp: 'Witting Mawsor' },
  { acNo: 35, name: 'Ranikor', winner: 'Martin M. Danggo', party: 'INC', year: 2018, votes: 10952, margin: 2002, runnerUp: 'Pius Marwein' },
  { acNo: 36, name: 'Mawkyrwat', winner: 'Renikton Lyngdoh Tongkhar', party: 'HSPDP', year: 2018, votes: 6777, margin: 458, runnerUp: 'Carnes Sohshang' },
  { acNo: 37, name: 'Kharkutta', winner: 'Rupert Momin', party: 'NPEP', year: 2018, votes: 14654, margin: 809, runnerUp: 'Cherak Watre Momin' },
  { acNo: 38, name: 'Mendipathar', winner: 'Marthon Sangma', party: 'INC', year: 2018, votes: 9347, margin: 2677, runnerUp: 'Frankenstein W. Momin' },
  { acNo: 39, name: 'Resubelpara', winner: 'Timothy Shira', party: 'NPEP', year: 2018, votes: 6720, margin: 1763, runnerUp: 'Salseng C Marak' },
  { acNo: 40, name: 'Bajengdoba', winner: 'Pongseng Marak', party: 'NPEP', year: 2018, votes: 11648, margin: 1964, runnerUp: 'Brigady Napak Marak' },
  { acNo: 41, name: 'Songsak', winner: 'Dr. Mukul Sangma', party: 'INC', year: 2018, votes: 10274, margin: 1830, runnerUp: 'Nihim D Shira' },
  { acNo: 42, name: 'Rongjeng', winner: 'Jim M Sangma', party: 'NPEP', year: 2018, votes: 4846, margin: 550, runnerUp: 'Walseng M. Sangma' },
  { acNo: 43, name: 'William Nagar', winner: 'Marcuise N .Marak', party: 'NPP', year: 2018, votes: 9656, margin: 4920, runnerUp: 'Sengbath R. Marak' },
  { acNo: 44, name: 'Raksamgre', winner: 'Benedic R. Marak', party: 'NPEP', year: 2018, votes: 9104, margin: 624, runnerUp: 'Limison D. Sangma' },
  { acNo: 45, name: 'Tikrikila', winner: 'Jimmy D. Sangma', party: 'INC', year: 2018, votes: 7167, margin: 1407, runnerUp: 'Rahinath Barchung' },
  { acNo: 46, name: 'Phulbari', winner: 'S. G. Esmatur Mominin', party: 'NPEP', year: 2018, votes: 7716, margin: 1134, runnerUp: 'Abu Taher Mondal' },
  { acNo: 47, name: 'Rajabala', winner: 'Dr. Azad Zaman', party: 'INC', year: 2018, votes: 7420, margin: 938, runnerUp: 'Ashahel D. Shira' },
  { acNo: 48, name: 'Selsella', winner: 'Clement Marak', party: 'INC', year: 2018, votes: 12619, margin: 3597, runnerUp: 'Ferlin C. A. Sangma' },
  { acNo: 49, name: 'Dadenggre', winner: 'James Pangsang Kongkal Sangma', party: 'NPEP', year: 2018, votes: 7239, margin: 2785, runnerUp: 'Rupa M. Marak' },
  { acNo: 50, name: 'North Tura', winner: 'Thomas A. Sangma', party: 'NPEP', year: 2018, votes: 6487, margin: 2096, runnerUp: 'Noverfield R. Marak' },
  { acNo: 51, name: 'South Tura', winner: 'Agatha K. Sangma', party: 'NPEP', year: 2018, votes: 6499, margin: 1603, runnerUp: 'Billykid A. Sangma' },
  { acNo: 52, name: 'Rangsakona', winner: 'Zenith M. Sangma', party: 'INC', year: 2018, votes: 13981, margin: 1962, runnerUp: 'Subir M. Marak' },
  { acNo: 53, name: 'Ampati', winner: 'Dr. Mukul Sangma', party: 'INC', year: 2018, votes: 16721, margin: 8104, runnerUp: 'Bakul Ch. Hajong' },
  { acNo: 54, name: 'Mahendraganj', winner: 'Dikkanchi D. Shira', party: 'INC', year: 2018, votes: 14292, margin: 8085, runnerUp: 'Premananda Koch' },
  { acNo: 55, name: 'Salmanpara', winner: 'Winnerson D. Sangma', party: 'INC', year: 2018, votes: 6613, margin: 1915, runnerUp: 'Ian Botham K. Sangma' },
  { acNo: 56, name: 'Gambegre', winner: 'Saleng A. Sangma', party: 'NCP', year: 2018, votes: 7291, margin: 136, runnerUp: 'Sadhiarani M. Sangma' },
  { acNo: 57, name: 'Dalu', winner: 'Brening A. Sangma', party: 'NPEP', year: 2018, votes: 4092, margin: 784, runnerUp: 'Kenethson Sangma' },
  { acNo: 58, name: 'Rongara Siju', winner: 'Rakkam A. Sangma', party: 'NPEP', year: 2018, votes: 8108, margin: 1108, runnerUp: 'Rophul S. Marak' },
  { acNo: 59, name: 'Chokpot', winner: 'Lazarus Sangma', party: 'INC', year: 2018, votes: 8410, margin: 2051, runnerUp: 'Secondson A. Sangma' },
  { acNo: 60, name: 'Baghmara', winner: 'Samuel M. Sangma', party: 'IND', year: 2018, votes: 8070, margin: 2242, runnerUp: 'Sengnal N. Sangma' },
];

export const ml2018Map = new Map(ML_2018_RESULTS.map((r) => [r.acNo, r]));

export function getML2018Result(acNo: number): MLHistoricalResult | undefined {
  return ml2018Map.get(acNo);
}
