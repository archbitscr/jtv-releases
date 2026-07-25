// Enriches scraped channels with language/genre categories
// Run: node scripts/enrichChannels.cjs

const fs = require('fs');
const path = require('path');

async function main() {
  // Scrape channels
  const domain = 'https://dlhd.st/';
  const url = `${domain}24-7-channels.php?t=${Date.now()}`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36' }
  });
  const text = await res.text();
  const channels = [];
  const regex = /<a[^>]+href=["']?([^"'>]*watch\.php\?id=([0-9]+))["']?[^>]*>(.*?)<\/a>/gis;
  let match;
  while ((match = regex.exec(text)) !== null) {
    const id = match[2];
    const content = match[3].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    // Decode HTML entities
    const name = content.split('ID:')[0].trim()
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&#039;/g, "'")
      .replace(/&quot;/g, '"');
    if (name && id) {
      channels.push({ id, name, path: `watch.php?id=${id}`, favorite: false, watchTime: 0 });
    }
  }

  console.log(`Scraped ${channels.length} channels`);

  // Country/suffix → language mapping
  const langRules = [
    // English
    { patterns: [/\bUSA\b/i, /\bUS\b/i, /\bUK\b/i, /\bCA\b$/i, /\bCanada\b/i, /\bAustralia\b/i, /\bAU\b$/i, /\bNZ\b$/i, /\bIreland\b/i, /\bBBCA?\b/i, /\bNBC\b/i, /\bCBS\b/i, /\bABC\b/i, /\bFOX\b/i, /\bESPN(?!.*Brasil)(?!.*Argentina)(?!.*Deportes)(?!.*MX)(?!.*Espa)/i, /\bCNN\b/i, /\bMSNBC\b/i, /\bPBS\b/i, /\bSEC Network/i, /\bACC Network/i, /\bNFL\b/i, /\bNBA\b/i, /\bMLB\b/i, /\bNHL\b/i, /\bSuperSport\b/i, /\bFanDuel\b/i, /\bShowtime\b/i, /\bHBO(?!.*Poland)/i, /\bStarz/i, /\bMGM\+/i, /\bTNT Sports \d UK/i, /\bSky Sports.*UK\b/i, /\bSky Cinema.*UK\b/i, /\bSky (?:Showcase|Arts|Comedy|Crime|History|MAX|Atlantic|Witness)\b/i, /\bChannel [45] UK\b/i, /\bITV \d UK\b/i, /\bBBC (?:One|Two|Three|Four) UK\b/i, /\bBBC News\b/i, /\bDAZN.*UK\b/i, /\bViaplay.*UK\b/i, /\bTNT Sports.*UK\b/i, /\bSportsnet\b/i, /\bTSN\d/i, /\bWillow/i, /\bPDC TV\b/i, /\bTennis Channel\b/i, /\bGOLF Channel/i, /\bWWE\b/i, /\bFight Network\b/i, /\bAdult Swim\b/i, /\bCartoon Network\b/i, /\bDisney\b/i, /\bNick/i, /\bBoomerang\b/i, /\bSmithsonian\b/i, /\bNational Geographic\b/i, /\bDiscovery\b/i, /\bAnimal Planet\b/i, /\bHGTV\b/i, /\bFood Network\b/i, /\bTravel Channel\b/i, /\bHistory USA\b/i, /\bLifetime\b/i, /\bHallmark\b/i, /\bE! Entertainment\b/i, /\bBravo USA\b/i, /\bOxygen\b/i, /\bFreeform\b/i, /\bSYFY\b/i, /\bUSA Network\b/i, /\bParamount Network\b/i, /\bFX\b.*USA/i, /\bComedy Central\b/i, /\bBET USA\b/i, /\bMTV USA\b/i, /\bVH1 USA\b/i, /\bCMT USA\b/i, /\bFashion TV\b/i, /\bReelz\b/i, /\bSundance\b/i, /\bIFC TV\b/i, /\bTCM USA\b/i, /\bCinemax\b/i, /\bFX Movie\b/i, /\bSEC Network\b/i, /\bPac-12\b/i, /\bBIG TEN\b/i, /\bESPNU\b/i, /\bESPNews\b/i, /\bCBSSN\b/i, /\bFox Weather\b/i, /\bFox News\b/i, /\bFox Business\b/i, /\bNewsmax\b/i, /\bNewsNation\b/i, /\bC SPAN\b/i, /\bCourt TV\b/i, /\bLaw & Crime\b/i, /\bRacing Tv UK\b/i, /\bSky Sports Racing UK\b/i, /\bLaLigaTV UK\b/i, /\bPremier Sports Ireland\b/i, /\bLiverpool TV\b/i, /\bMUTV UK\b/i, /\bTNT Sports \d UK\b/i, /\bRTE [12]\b/i, /\bStar Sports.*IN\b/i, /\bSONY TEN\b/i, /\bAstro\b/i, /\bbeIN Sports MENA English/i, /\bbeIN SPORTS USA\b/i, /\bbeIN SPORTS XTRA\b/i, /\bbeIN SPORTS Australia\b/i],
      lang: 'English' },
    // Español
    { patterns: [/\bSpain\b/i, /\bES\b$/i, /\bMX\b$/i, /\bArgentina\b/i, /\bChile\b/i, /\bColumbia\b/i, /\bUruguay\b/i, /\bMovistar\b/i, /\bDAZN.*Spain\b/i, /\bDAZN LaLiga\b/i, /\bDAZN F1 ES\b/i, /\bLaLiga\b(?!.*UK)/i, /\bTelecinco\b/i, /\bTVE La [12]\b/i, /\bAntena 3 Spain\b/i, /\bCuatro Spain\b/i, /\bLa Sexta\b/i, /\bGOL PLAY\b/i, /\bTeledeporte\b/i, /\b#Vamos\b/i, /\bEuroSport.*Spain\b/i, /\bBarca TV\b/i, /\bReal Madrid TV\b/i, /\bMundotoro\b/i, /\bESPN.*Argentina\b/i, /\bESPN Deportes\b/i, /\bESPN.*MX\b/i, /\bFox Sports.*Argentina\b/i, /\bFox Sports.*MX\b/i, /\bTNT Sports.*Argentina\b/i, /\bTNT Sports.*Chile\b/i, /\bTYC Sports\b/i, /\bWin Sports\b/i, /\bVTV\+.*Uruguay\b/i, /\bClaro Sports\b/i, /\bTVC Deportes\b/i, /\bTUDN\b/i, /\bTelemundo\b/i, /\bUnivision\b/i, /\bUnimas\b/i, /\bFOX Deportes\b/i, /\bNBC Universo\b/i, /\bGalavisi/i, /\bAzteca\b/i, /\bCanal\s*5 MX\b/i, /\bLas Estrellas\b/i, /\bHBO Latino\b/i, /\bbeIN SPORTS en Espa/i, /\bFox Sports Premium MX\b/i, /\bCBS Sports Golazo\b/i, /\bDAZN.*FIFA.*Clubes\b/i],
      lang: 'Español' },
    // Français
    { patterns: [/\bFrance\b/i, /\bCanal\+(?! Sport Poland| Sport CZ| Sport SK| Sport 2 CZ| Sport 2 SK| Sport 3 CZ| Sport 3 SK| Sport 4 CZ| Sport 5 CZ| Sport 6 CZ| Sport 7 CZ| Sport 8 CZ| Premium Poland| Family Poland| Seriale Poland| Extra \d Poland| Sport 2 Poland| Sport 3 Poland)/i, /\bRMC Sport/i, /\bbeIN SPORTS \d France\b/i, /\bbeIN Sports MAX \d+ France\b/i, /\bCanal\+ Foot France\b/i, /\bCanal\+ Sport360\b/i, /\bCanal\+ MotoGP France\b/i, /\bCanal\+ Formula 1\b/i, /\bDAZN Ligue 1 France\b/i, /\bL'Equipe\b/i, /\bSport en France\b/i, /\bTF1\b/i, /\bM6 France\b/i, /\bFrance [2345]\b/i, /\bBFM TV\b/i, /\bC8 France\b/i, /\bTMC France\b/i, /\bCNews France\b/i, /\bRMC Story\b/i, /\bW9 France\b/i, /\b6ter France\b/i, /\bArte France\b/i, /\bAutomoto La cha/i, /\bEurosport.*France\b/i, /\bCanal\+ Sport \d Afrique\b/i, /\bNoovo\b/i, /\bRDS\b/i, /\bTVA Sports\b/i],
      lang: 'Français' },
    // Português
    { patterns: [/\bPortugal\b/i, /\bPT\b$/i, /\bBrasil\b/i, /\bSporTV\b/i, /\bGlobo\b/i, /\bCombate Brasil\b/i, /\bTNT Brasil\b/i, /\bPremier Brasil\b/i, /\bESPN.*Brasil\b/i, /\bBandsports Brasil\b/i, /\bSport TV\d\b/i, /\bEleven Sports \d Portugal\b/i, /\bBenfica TV\b/i, /\bPorto Canal\b/i, /\bSporting TV\b/i, /\bCanal 11 Portugal\b/i, /\bSIC Portugal\b/i, /\bRTP [123]\b/i, /\bTVI\b/i, /\bCMTV Portugal\b/i, /\bAXN Movies Portugal\b/i],
      lang: 'Português' },
    // Arabic
    { patterns: [/\bArabic\b/i, /\bUAE\b/i, /\bQatar\b/i, /\bMENA\b/i, /\bAbu Dhabi\b/i, /\bDubai\b/i, /\bSSC Sport\b/i, /\bAlkass\b/i, /\bOnTime Sports\b/i, /\bbeIN Sports \d Arabic\b/i, /\bbeIN SPORTS MAX AR\b/i, /\bbeIN Sports HD Qatar\b/i, /\bbeIN Sports \d Malaysia\b/i],
      lang: 'Arabic' },
    // Italiano
    { patterns: [/\bItaly\b/i, /\bRai [1234]\b/i, /\bRai Sport\b/i, /\bRai Premium\b/i, /\bSky.*Italy\b/i, /\bDAZN ZONA Italy\b/i, /\bEuroSport.*Italy\b/i, /\bItalia 1\b/i, /\bLa7\b/i, /\b20 Mediaset\b/i],
      lang: 'Italiano' },
    // Deutsch
    { patterns: [/\bDE\b$/i, /\bGermany\b/i, /\bDAZN.*DE\b/i, /\bSky Sport.*DE\b/i, /\bSky Sports.*DE\b/i, /\bBundesliga\b/i, /\bSport1 Germany\b/i, /\bSportdigital/i, /\bRTL DE\b/i, /\bSAT\.1 DE\b/i, /\bProSieben\b/i, /\bKabel Eins\b/i, /\bSixx DE\b/i, /\bSUPER RTL DE\b/i, /\bZDF\b/i, /\b3sat DE\b/i, /\bArte DE\b/i, /\bMDR DE\b/i, /\bNDR DE\b/i, /\bWDR DE\b/i, /\bSWR DE\b/i, /\bBR Fernsehen\b/i, /\bSR Fernsehen\b/i, /\bSky Sport Austria\b/i],
      lang: 'Deutsch' }
  ];

  // Country-specific patterns for non-language-filter countries (no lang category, just "all")
  // These are countries that don't map to English/Spanish/French/Portuguese/Arabic/Italian/German

  channels.forEach(ch => {
    const cats = new Set(['all']);
    const name = ch.name;

    // Assign language
    for (const rule of langRules) {
      if (rule.patterns.some(p => p.test(name))) {
        cats.add(rule.lang);
      }
    }

    // Tag 18+ channels as XXX
    if (/18\+/i.test(name) || /\badult\b/i.test(name)) {
      cats.add('XXX');
    }

    ch.categories = Array.from(cats);
  });

  // Sort by ID numerically
  channels.sort((a, b) => parseInt(a.id) - parseInt(b.id));

  // Stats
  const langStats = {};
  channels.forEach(ch => {
    ch.categories.forEach(c => {
      if (c !== 'all') langStats[c] = (langStats[c] || 0) + 1;
    });
  });
  console.log('Category stats:', langStats);
  const uncategorized = channels.filter(ch => ch.categories.length === 1 && ch.categories[0] === 'all');
  console.log('Uncategorized (all only):', uncategorized.length, uncategorized.map(c => c.name).join(', '));

  // Write output
  const outPath = path.join(__dirname, '..', 'data', 'defaultChannels.json');
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(channels, null, 2));
  console.log('Written to', outPath, '- Total:', channels.length);
}

main().catch(e => console.error(e));
