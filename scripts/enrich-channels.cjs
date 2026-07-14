#!/usr/bin/env node
/**
 * Channel Enrichment Script
 * Adds genre/event categories to channels based on name-pattern matching.
 * ADDITIVE ONLY — never removes existing categories.
 * Run: node scripts/enrich-channels.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/defaultChannels.json');
const DRY_RUN = process.argv.includes('--dry-run');

// ─── Genre detection rules ─────────────────────────────────────────────────────
const GENRE_RULES = [

    // Kids / Animation
    { test: /\b(cartoon\s+network|boomerang|nicktoons|teennick|nick\s+jr|disney\s+(jr|xd|channel|junior)|universal\s+kids|discovery\s+family|ytv\b|sky\s+cinema\s+animation|jim\s+jam|toggolino|baby\s+(tv|first))\b/i, add: ['Kids', 'Animation'] },
    { test: /\b(nickelodeon)\b/i, add: ['Kids'] },
    { test: /\bnick\b(?!\s*(music|at\s*nite))/i, add: ['Kids'] },

    // News / Business
    { test: /\b(fox\s+business|cnbc|bloomberg|bbc\s+world\s+news|sky\s+news|newsmax|newsnation|headline\s+news|tvp\s+info|news\s+18|wion|euronews|france\s+24|dw\s+news|al\s+jazeera|c\s*span|weather\s+channel|fox\s+weather)\b/i, add: ['News'] },
    { test: /\b(cnn|msnbc|fox\s+news|abc\s+news|nbc\s+news|cbs\s+news|pbs\s+news|law\s+&\s+crime|sky\s+sports\s+news)\b/i, add: ['News'] },

    // Investigation / Crime
    { test: /\b(investigation\s+discovery|court\s+tv|oxygen\b|crime\s*\+|crime\s+investigation|true\s+crime)\b/i, add: ['Investigation', 'Documentary'] },
    { test: /\blaw\s+&\s+crime\b/i, add: ['Investigation', 'News'] },

    // Documentary / History / Science
    { test: /\b(national\s+geo(graphic)?|nat\s+geo|smithsonian|american\s+heroes|ahc\b|history\s+(channel|usa|uk|hd)?|military\s+history|science\s+channel|discovery\s+science|curiosity\s+stream|pbs\b|destination\s+america|tvo\b)\b/i, add: ['Documentary'] },
    { test: /\bdiscovery\s+(channel|life\s+channel|life)\b/i, add: ['Documentary'] },
    { test: /\b(vice\s+(tv|news)|animal\s+planet)\b/i, add: ['Documentary'] },

    // Travel
    { test: /\b(travel\s+channel|discovery\s+travel|voyage|globe\s+trekker)\b/i, add: ['Travel', 'Lifestyle'] },

    // Food / Cooking
    { test: /\b(food\s+network|cooking\s+channel|bon\s+app[eé]tit|tastemade)\b/i, add: ['Food', 'Lifestyle'] },

    // Lifestyle / Home / Reality
    { test: /\b(hgtv|magnolia\s+network|tlc\b|fyi\b|cleo\s+tv|fetv\b|great\s+american\s+(family|country))\b/i, add: ['Lifestyle', 'Reality'] },
    { test: /\b(wetv|we\s+tv)\b/i, add: ['Reality', 'Lifestyle'] },
    { test: /\b(oprah\s+winfrey\s+network|own\b)\b/i, add: ['Reality', 'Lifestyle'] },
    { test: /\bbravo\b(?!\s+sport)/i, add: ['Lifestyle', 'Reality'] },
    { test: /\bfashion\s+tv\b/i, add: ['Lifestyle'] },

    // Music
    { test: /\b(cmt\b|country\s+music|fuse\s+tv|axs\s+tv|vh1\b|nick\s+music|palco\s+music)\b/i, add: ['Music'] },
    { test: /\bmtv\b/i, add: ['Music'] },

    // Comedy
    { test: /\b(comedy\s+central|trutv|comet\s*(tv|usa)?|dave\b)\b/i, add: ['Comedy', 'Series'] },
    { test: /\b(adult\s+swim|fxx\b)\b/i, add: ['Comedy', 'Series'] },
    { test: /\bgold\b(?!\s*(uk)?.*sport)/i, add: ['Comedy', 'Series'] },

    // Movies (premium)
    { test: /\bhbo\b/i, add: ['Movies', 'Series'] },
    { test: /\b(starz\b|starz\s+(cinema|comedy|edge|encore|action|western|kidz|in\s+black))\b/i, add: ['Movies'] },
    { test: /\bstarz\s+encore\b/i, add: ['Movies'] },
    { test: /\b(showtime\b|sho\b|shoxbet|shoxxbet)\b/i, add: ['Movies'] },
    { test: /\bcinemax\b/i, add: ['Movies'] },
    { test: /\bsky\s+cinema\b/i, add: ['Movies'] },
    { test: /\b(tcm\b|mgm\s*\+?|film4\b|ifc\b|sundance\s*(tv|channel)?|reelz|tmc\b|epix\b|v\s+film|mubi\b|sky\s+max\b)\b/i, add: ['Movies'] },
    { test: /\bfx\s+movies?\b/i, add: ['Movies'] },
    { test: /\bhallmark\s+movies?\b/i, add: ['Movies'] },
    { test: /\bgrit\s+(channel|tv)\b/i, add: ['Movies', 'Series'] },

    // Series / Drama
    { test: /\b(amc\b|syfy\b|freeform|the\s+cw\b|antenna\s+tv|heroes\s+&\s+icons|ion\s*(tv|usa)?|bounce\s+tv|me\s+tv|laff\s+tv|tvland\b|tv\s+land\b|logo\s+tv)\b/i, add: ['Series'] },
    { test: /\b(tbs\b|tnt\b(?!\s+sports?))\b/i, add: ['Series'] },
    { test: /\b(usa\s+network)\b/i, add: ['Series', 'Movies'] },
    { test: /\blifetime\b(?!\s+movies?)/i, add: ['Series', 'Movies'] },
    { test: /\blifetime\s+movies?\b/i, add: ['Movies'] },
    { test: /\bfx\b(?!\s*(movie|movies?|x\b|deportes|sports?))\b/i, add: ['Series'] },
    // Broadcast networks
    { test: /\babc\b(?!\s*news)/i, add: ['Series', 'News'] },
    { test: /\bnbc\b(?!\s*(news|sports?|\d))/i, add: ['Series', 'News'] },
    { test: /\bcbs\b(?!\s*(news|sports?|\d))/i, add: ['Series', 'News'] },
    { test: /\bfox\b(?!\s*(news|sports?|business|cricket|soccer|deportes|\s+hd|\d))/i, add: ['Series', 'News'] },
    // UK/European/Canadian generalist
    { test: /\b(itv\s*\d?|e4\b|channel\s*[45]|5\s*usa\b|s4c\b|rte\s*\d?|dave\b)\b/i, add: ['Series'] },
    { test: /\b(ctv\b|citytv\b|cbc\b|yes\s+tv\b|ctv\s*2|global\s+ca\b)\b/i, add: ['Series'] },
    // Latin American
    { test: /\b(las\s+estrellas|azteca\s+uno|antena\s*3|la\s+sexta\b|cuatro\b(?!\s+sport)|tve\s+la\s*2)\b/i, add: ['Series'] },
    // US cable
    { test: /\b(bet\b|tv\s+one\b|metv\b|cozi\s+tv|galavision|cw\s+pix|cw\s+philly|nbc\s*\d+)\b/i, add: ['Series'] },
    { test: /\b(game\s+show\s+network|gsn\b|itv\s+quiz)\b/i, add: ['Series'] },
    // DSTV
    { test: /\b(m.?net\b|dstv\s+m.?net|mzansi|dstv\s+zulu|tv2\s+zulu)\b/i, add: ['Series', 'Movies'] },
    { test: /\b(kyknet|dstv\s+kyk)\b/i, add: ['Series'] },
    // Missing specifics
    { test: /\bcw\b(?!\s+(pix|philly))/i, add: ['Series'] },
    { test: /\ba&e\b/i, add: ['Reality', 'Documentary'] },
    { test: /\be!\s*(entertainment|television)?\b/i, add: ['Reality'] },
    { test: /\bhallmark\b(?!\s+movies?)/i, add: ['Movies', 'Lifestyle'] },
    { test: /\bpop\s+tv\b/i, add: ['Reality'] },
    { test: /\b(my9|my\s*9\s*tv)\b/i, add: ['Series'] },
    { test: /\bgalavi/i, add: ['Series'] },
    { test: /\bvtv\b/i, add: ['Sports'] },
    { test: /\bmundotoro\b/i, add: ['Regional'] },
    { test: /\b(cbsny|foxny|nbcny|abcny)\b/i, add: ['Series', 'News'] },
    // Regional
    { test: /\b(fox\s+hd\s+bulgaria|s4c\b)\b/i, add: ['Regional'] },

    // Sports (broad) — last so specific genres above are applied first
    { test: /\b(espn\s*\d*|espnews|espnu|espn\s+deportes|sec\s+network|big\s+ten\s+network|pac.?12\s+network|bein\s+sports?|fox\s+sports?|cbs\s+sports?\s+network|nbc\s+sports?|tnt\s+sports?|sky\s+sports?\b(?!\s+news)|eurosport|supersport|astro\s+super\s*sport|sportsnet|tsn\s*\d*|rds\s*\d*|fox\s+soccer|movistar\s+deportes?\b|movistar\s+laliga|claro\s+sports?|fanduel\s+sports?\s+network|altitude\s+sports?|viaplay\s+sports?|vodafone\s+sport|premier\s+sports?|prima\s+sport|arena\s+sport|a\s+sport\s+pk|ten\s+sports?|ptv\s+sports?|fight\s+network|pdc\s+tv|racer\s+tv|racing\s+tv|willow\s+(cricket|2)|astro\s+cricket|starzplay\s+cric|gol\s+play|teledeporte|tvc\s+deportes?|tudn|tyc\s+sports?|win\s+sports?\+?|space\s+city\s+home|chicago\s+sports?\s+network|marquee\s+sports?\s+network|monumental\s+sports?\s+network|masn\b|nesn\b|msg\b|spectrum\s+sports?|tv4\s+(sport|hockey|tennis|motor)|dazn|discovery\s+(turbo|velocity)|fox\s+deportes|vtv\+|acc\s+network|yes\s+network|sony\s+ten\s*\d|barca\s+tv|mutv\b|la\s+sexta\s*sport)\b/i, add: ['Sports'] },
    { test: /\b(nfl\s+network|nba\s+tv|mlb\s+network|nhl\s+network|golf\s+channel|tennis\s+channel|tennis\s*\+|fight\s+network|wwe\s+network|ppv\b)\b/i, add: ['Sports'] },
    { test: /\bsports?(net|line)?\b/i, add: ['Sports'] },
];

// ─── Event detection rules ────────────────────────────────────────────────────
const EVENT_RULES = [
    { test: /\b(formula[\s\-]?1|formula\s+one|f1\b|racer\s+tv|tv4\s+motor|dazn\s+f1)\b/i, add: ['Formula 1'] },
    { test: /\b(motogp|moto\s*gp|dazn\s+motogp)\b/i, add: ['MotoGP'] },
    { test: /\b(nascar|indycar|motorsport|discovery\s+(turbo|velocity)|supercars?|wtcr|dtm|gt\s+world)\b/i, add: ['Motorsport'] },
    { test: /\b(rally|wrc\b|dakar)\b/i, add: ['Rally'] },
    { test: /\bnba\b/i, add: ['NBA'] },
    { test: /\bnfl\b/i, add: ['NFL'] },
    { test: /\b(nhl\s+network|tv4\s+hockey)\b/i, add: ['NHL'] },
    { test: /\b(mlb\s+network|baseball)\b/i, add: ['MLB'] },
    { test: /\b(golf\s+channel|sky\s+sports\s+golf|supersport\s+golf|movistar\s+golf|dazn\s+golf|pga\s+tour)\b/i, add: ['Golf'] },
    { test: /\b(tennis\s+channel|tennis\s*\+\s*\d*|sky\s+sports\s+tennis|supersport\s+tennis|tv4\s+tennis)\b/i, add: ['Tennis'] },
    { test: /\b(ufc\b|bellator\b|mma\b)\b/i, add: ['UFC'] },
    { test: /\b(boxing|fight\s+network|wwe\s+network|box\s+nation)\b/i, add: ['Boxing'] },
    { test: /\b(cycling\b|vuelta|giro\s+d.italia|tour\s+de)\b/i, add: ['Cycling'] },
    { test: /\b(cricket|criclife|willow\s*(cricket|\s*2)|astro\s+cricket|fox\s+cricket|supersport\s+cricket|sony\s+ten)\b/i, add: ['Cricket'] },
    { test: /\b(rugby|supersport\s+rugby)\b/i, add: ['Rugby'] },
    { test: /\b(laliga\w*|la\s*liga\w*|premier\s+league|champions\s+league|liga\s+de\s+campeones|supercopa|copa\s+del|seria\s+a|serie\s+a|bundesliga|ligue\s+1|mundial\s+de\s+clubes|fox\s+soccer|golazo|gol\s+play|teledeporte|tudn|real\s+madrid\s+tv|lfc\s+tv|liverpool\s+tv|barca\s+tv|mutv\b|cbs\s+sports\s+golazo|movistar\s+laliga|win\s+sports|tyc\s+sports|bein\s+sports?|sky\s+sports\s+football|fox\s+deportes)\b/i, add: ['Futbol'] },
    { test: /\b(fifa|world\s+cup|copa\s+del\s+mundo|dazn\s+mundial)\b/i, add: ['FIFA 2026'] },
    { test: /\b(concerts?\b|axs\s+tv)\b/i, add: ['Concerts'] },
    { test: /\b(awards?\s+show|oscars?|emmys?|grammys?|golden\s+globe|bafta)\b/i, add: ['Awards'] },
    { test: /\b(festival\b|coachella|glastonbury)\b/i, add: ['Festival'] },
];

const SUGGESTED_NEW = {
    'Wrestling (event)': /\bwwe\s+network\b/i,
    'Horse Racing (event)': /\bracing\s+tv\b/i,
    'Darts (event)': /\bpdc\s+tv\b/i,
};

function applyRules(name, existing) {
    const set = new Set(existing);
    const added = [];
    for (const rule of GENRE_RULES) {
        if (rule.test.test(name)) {
            for (const cat of rule.add) {
                if (!set.has(cat)) { set.add(cat); added.push(cat); }
            }
        }
    }
    for (const rule of EVENT_RULES) {
        if (rule.test.test(name)) {
            for (const cat of rule.add) {
                if (!set.has(cat)) { set.add(cat); added.push(cat); }
            }
        }
    }
    return { final: [...set], added };
}

function main() {
    const raw = fs.readFileSync(DATA_PATH, 'utf-8');
    const data = JSON.parse(raw);
    const channels = Object.values(data);
    const active = channels.filter(c => {
        const cats = c.categories || [];
        return cats.includes('English') || cats.includes('Español');
    });

    let totalChanged = 0;
    const changeLog = [];
    const suggestedNew = {};
    const enrichedCats = new Map();

    for (const [label, rx] of Object.entries(SUGGESTED_NEW)) {
        const matches = active.filter(c => rx.test(c.name)).map(c => c.name);
        if (matches.length > 0) suggestedNew[label] = matches;
    }

    const enriched = {};
    for (const [idx, ch] of Object.entries(data)) {
        const existing = ch.categories || [];
        const isActive = existing.includes('English') || existing.includes('Español');

        if (!isActive) { enriched[idx] = ch; continue; }

        const { final, added } = applyRules(ch.name, existing);
        enrichedCats.set(ch.name, final);

        if (added.length > 0) {
            totalChanged++;
            changeLog.push({ name: ch.name, added });
            enriched[idx] = !DRY_RUN ? { ...ch, categories: final } : ch;
        } else {
            enriched[idx] = ch;
        }
    }

    console.log('\n═══════════════════════════════════════════════════════');
    console.log(`  Channel Enrichment Report${DRY_RUN ? ' (DRY RUN)' : ''}`);
    console.log('═══════════════════════════════════════════════════════');
    console.log(`  Active channels:  ${active.length}`);
    console.log(`  Channels updated: ${totalChanged}`);
    console.log('');

    if (changeLog.length > 0) {
        console.log('── Changes ─────────────────────────────────────────────');
        for (const entry of changeLog) {
            console.log(`  [+${entry.added.join(', ')}]  ${entry.name}`);
        }
    }

    if (Object.keys(suggestedNew).length > 0) {
        console.log('\n── Suggested NEW filters for appState.js ────────────────');
        for (const [label, names] of Object.entries(suggestedNew)) {
            console.log(`  ${label}: ${names.join(', ')}`);
        }
    }

    const stillBlank = active.filter(c => {
        const cats = enrichedCats.get(c.name) || c.categories || [];
        const meaningful = cats.filter(cat => cat !== 'all' && cat !== 'English' && cat !== 'Español');
        return meaningful.length === 0;
    }).map(c => c.name);

    if (stillBlank.length > 0) {
        console.log(`\n── Still unmatched after enrichment (${stillBlank.length}) ───────────`);
        stillBlank.forEach(n => console.log(`  ? ${n}`));
    } else {
        console.log('\n  All active channels now have at least one genre/event.');
    }

    console.log('\n═══════════════════════════════════════════════════════\n');

    if (!DRY_RUN) {
        fs.writeFileSync(DATA_PATH, JSON.stringify(enriched, null, 2));
        console.log(`  Saved to ${DATA_PATH}\n`);
    }
}

main();
