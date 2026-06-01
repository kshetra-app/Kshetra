/**
 * Fix gender mismatches in MLA profile files.
 * Only fixes HIGH CONFIDENCE cases where the name clearly indicates
 * the opposite gender from what's declared.
 */
const fs = require('fs');
const path = require('path');

// High-confidence male name components (never used for women in Indian context)
const DEFINITELY_MALE = [
  'kumar', 'chand', 'lal', 'ram', 'nath', 'prasad', 'narayan', 'mohan',
  'bahadur', 'bhai', 'shankar', 'ganesh', 'suresh', 'mahesh', 'ramesh',
  'rajesh', 'dinesh', 'rakesh', 'mukesh', 'naresh', 'ashok', 'vinod',
  'pramod', 'manoj', 'anil', 'sunil', 'ravi', 'sanjay', 'vijay', 'ajay',
  'krishna', 'gopal', 'satish', 'girish', 'harish', 'jagdish', 'manish',
  'kamal', 'vimal', 'shyam', 'ghanshyam', 'bhagwan', 'ishwar',
  'govind', 'arvind', 'pravin', 'sachin', 'nitin', 'chetan',
  'chandrakant', 'vishwanath', 'dattatray', 'sawant', 'rane',
  'bhushan', 'kishore', 'kishori', 'thakur', 'bikram', 'hoshyar',
  'jeet', 'dharam', 'bholaram', 'motilal', 'panna', 'sahab',
  'ghanshayam', 'chainsingh', 'inder', 'umakant', 'surjakumar',
  'ranjan', 'premchandra', 'khemchand', 'brojen', 'pathan',
  'lorrain', 'rasik', 'lok', 'tewari', 'dhami', 'butola',
  'senthil', 'ramu', 'devendra', 'sushant', 'veerendra',
  'bhanwarsingh', 'dhirendra', 'jayant', 'rameshwar', 'aashish',
  'rajkumar', 'dabbu', 'dipak', 'munindra', 'shiladitya',
  'malender', 'sanjay', 'rakesh', 'chander',
];

// High-confidence female name components (never used for men)
const DEFINITELY_FEMALE = [
  'devi', 'begum', 'bai', 'amma', 'kumari', 'rani',
  'lakshmi', 'priya', 'savitha', 'savita', 'anita', 'sunita',
  'sushma', 'mamata', 'nirmala', 'pramila', 'kamla', 'meena',
  'uma', 'lata', 'gita', 'geeta', 'seema', 'sita', 'rekha',
  'saroj', 'padma', 'pushpa', 'radha', 'vijaya', 'sudha', 'usha',
  'asha', 'shanti', 'kanta', 'sarita', 'rita', 'vineeta', 'kavita',
  'babita', 'archana', 'renu', 'poonam', 'manju', 'ranjana',
  'vandana', 'sapna', 'dimple', 'hema', 'sangeeta', 'mamta',
  'smriti', 'manisha', 'priyanka', 'swati', 'anjali', 'pallavi',
  'sneha', 'deepa', 'anupriya', 'chitra', 'jyoti', 'rajni',
  'shobha', 'bharti', 'vidya', 'veena', 'meenakshi', 'parvati',
  'durga', 'vani', 'rohini', 'malti', 'nandini', 'pooja', 'neha',
  'divya', 'indrashah', 'usendi', 'lata', 'sangeeta', 'anuradha',
  'mina', 'shaila', 'ritu', 'kapoor',
  'sirisha', 'sowmya', 'swetha', 'bhagyalakshmi',
];

const profileFiles = fs.readdirSync('C:/K/data/seed')
  .filter(f => f.endsWith('-mla-profiles.ts'));

let totalFixes = 0;

for (const file of profileFiles) {
  const filePath = path.join('C:/K/data/seed', file);
  let content = fs.readFileSync(filePath, 'utf8');
  let fixesInFile = 0;

  // Find all name+gender pairs and fix mismatches
  const regex = /(name:\s*'([^']+)'[^}]*?gender:\s*')([MF])(')/g;
  
  content = content.replace(regex, (match, prefix, name, gender, suffix) => {
    const lower = name.toLowerCase();
    
    // Check if name is definitely male but marked F
    if (gender === 'F') {
      const isMale = DEFINITELY_MALE.some(ind => {
        const r = new RegExp('\\b' + ind.replace(/\./g, '\\.') + '\\b', 'i');
        return r.test(lower) || lower.includes(ind);
      });
      // Make sure it's NOT also matching female indicators
      const isFemale = DEFINITELY_FEMALE.some(ind => {
        const r = new RegExp('\\b' + ind.replace(/\./g, '\\.') + '\\b', 'i');
        return r.test(lower) || lower.includes(ind);
      });
      if (isMale && !isFemale) {
        fixesInFile++;
        return prefix + 'M' + suffix;
      }
    }
    
    // Check if name is definitely female but marked M
    if (gender === 'M') {
      const isFemale = DEFINITELY_FEMALE.some(ind => {
        const r = new RegExp('\\b' + ind.replace(/\./g, '\\.') + '\\b', 'i');
        return r.test(lower) || lower.includes(ind);
      });
      // Make sure it's NOT also matching male indicators
      const isMale = DEFINITELY_MALE.some(ind => {
        const r = new RegExp('\\b' + ind.replace(/\./g, '\\.') + '\\b', 'i');
        return r.test(lower) || lower.includes(ind);
      });
      if (isFemale && !isMale) {
        fixesInFile++;
        return prefix + 'F' + suffix;
      }
    }
    
    return match; // no change
  });

  if (fixesInFile > 0) {
    fs.writeFileSync(filePath, content);
    console.log(`${file}: fixed ${fixesInFile} gender entries`);
    totalFixes += fixesInFile;
  }
}

console.log(`\nTotal gender fixes: ${totalFixes}`);
