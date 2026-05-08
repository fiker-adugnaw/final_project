"""
Country and Jurisdiction Detector
Detects if queries refer to foreign legal systems
Provides comprehensive country detection for legal queries
"""

# ============================================
# FOREIGN JURISDICTION KEYWORDS DATABASE
# ============================================

FOREIGN_JURISDICTIONS = {
    "usa": {
        "name": "United States",
        "keywords": [
            "usa", "united states", "american", "us constitution", "supreme court us",
            "congress", "federal law us", "us code", "american law", "new york law",
            "california law", "texas law", "us court", "federal court us", "us congress",
            "house of representatives us", "senate us", "constitution of the united states",
            "bill of rights", "amendment", "us supreme court", "justice department us",
            "fbi", "cia", "federal bureau", "district court us", "appeals court us",
            "united states code", "usc", "federal register", "cfr", "state law us",
            "new york", "los angeles", "chicago", "houston", "phoenix", "philadelphia",
            "san antonio", "san diego", "dallas", "san jose", "austin", "jacksonville",
            "fort worth", "columbus", "charlotte", "san francisco", "indianapolis",
            "seattle", "denver", "washington dc", "boston", "el paso", "nashville",
            "detroit", "oklahoma city", "portland", "las vegas", "memphis", "louisville",
            "baltimore", "milwaukee", "albuquerque", "tucson", "fresno", "sacramento",
            "kansas city", "atlanta", "omaha", "colorado springs", "raleigh", "miami",
            "virginia beach", "oakland", "minneapolis", "tulsa", "wichita", "new orleans",
            "arlington", "cleveland", "bakersfield", "tampa", "aurora", "honolulu",
            "anaheim", "santa ana", "st. louis", "riverside", "corpus christi",
            "pittsburgh", "lexington", "anchorage", "stockton", "cincinnati",
            "st. paul", "toledo", "newark", "greensboro", "plano", "henderson",
            "lincoln", "buffalo", "jersey city", "chula vista", "fort wayne",
            "orlando", "st. petersburg", "chandler", "laredo", "norfolk", "durham",
            "madison", "lubbock", "irvine", "winston-salem", "glendale", "garland",
            "hialeah", "reno", "chesapeake", "gilbert", "baton rouge", "irving",
            "scottsdale", "north las vegas", "fremont", "boise", "richmond"
        ],
        "legal_systems": ["Common Law", "Federal System"],
        "constitution": "United States Constitution",
        "capital": "Washington, D.C.",
        "continent": "North America"
    },
    "uk": {
        "name": "United Kingdom",
        "keywords": [
            "uk", "united kingdom", "british", "england", "scotland", "wales",
            "northern ireland", "london", "parliament uk", "british law",
            "uk supreme court", "english law", "scottish law", "house of lords",
            "common law uk", "queen's bench", "crown court", "magistrates court",
            "uk parliament", "house of commons", "house of lords uk", "british constitution",
            "magna carta", "human rights act uk", "equality act uk", "uk legislation",
            "statutory instrument uk", "uk statutory instrument", "acts of parliament",
            "westminster", "edinburgh", "glasgow", "cardiff", "belfast", "birmingham",
            "manchester", "leeds", "newcastle", "liverpool", "bristol", "sheffield",
            "bradford", "coventry", "nottingham", "leicester", "hull", "stoke-on-trent",
            "wolverhampton", "plymouth", "southampton", "reading", "derby", "portsmouth",
            "aberdeen", "dundee", "inverness", "swansea", "newport", "belfast",
            "british overseas territories", "isle of man", "channel islands",
            "guernsey", "jersey", "gibraltar", "falkland islands"
        ],
        "legal_systems": ["Common Law", "Parliamentary System"],
        "constitution": "Uncodified Constitution (Constitutional conventions and statutes)",
        "capital": "London",
        "continent": "Europe"
    },
    "canada": {
        "name": "Canada",
        "keywords": [
            "canada", "canadian", "toronto", "ottawa", "vancouver", "quebec",
            "ontario", "canadian charter", "canadian constitution", "supreme court canada",
            "parliament canada", "canadian law", "quebec civil code", "quebec law",
            "common law canada", "civil law canada", "canadian charter of rights",
            "constitution act 1867", "constitution act 1982", "canadian parliament",
            "house of commons canada", "senate canada", "canadian legislation",
            "criminal code canada", "canadian criminal code", "rcmp", "canadian courts",
            "montreal", "calgary", "edmonton", "mississauga", "winnipeg", "hamilton",
            "brampton", "surrey", "quebec city", "halifax", "laval", "london ontario",
            "markham", "vaughan", "gatineau", "saskatoon", "longueuil", "burnaby",
            "windsor", "regina", "richmond", "richmond hill", "oakville", "burlington",
            "greater sudbury", "sherbrooke", "st. catharines", "trois-rivieres",
            "thurso", "kingston", "ajax", "langley", "pickering", "terrebonne",
            "st. john's", "abbotsford", "coquitlam", "saanich", "delta", "cambridge",
            "whitby", "guelph", "kelowna", "sarnia", "chatham-kent", "côte-saint-luc"
        ],
        "legal_systems": ["Common Law", "Civil Law (Quebec)"],
        "constitution": "Constitution Act, 1867 and Constitution Act, 1982",
        "capital": "Ottawa",
        "continent": "North America"
    },
    "australia": {
        "name": "Australia",
        "keywords": [
            "australia", "australian", "sydney", "melbourne", "brisbane", "perth",
            "canberra", "australian constitution", "high court australia",
            "australian law", "commonwealth australia", "australian parliament",
            "house of representatives australia", "senate australia", "commonwealth law",
            "australian legislation", "criminal code australia", "family law australia",
            "australian courts", "federal court australia", "family court australia",
            "adelaide", "gold coast", "newcastle", "wollongong", "logan city",
            "geelong", "hobart", "townsville", "cairns", "toowoomba", "darwin",
            "launceston", "albury", "wendouree", "ballarat", "bendigo", "melton",
            "moe", "traralgon", "mildura", "shepparton", "wangaratta", "warrnambool",
            "southport", "robina", "chermside", "carindale", "upper mount gravatt",
            "sunnybank", "toowong", "indooroopilly", "chermside west", "north lakes",
            "strathpine", "caboolture", "redcliffe", "caloundra", "maroochydore",
            "noosa", "gympie", "kingaroy", "dalby", "warwick", "stanthorpe",
            "goondiwindi", "roma", "charleville", "longreach", "mount isa",
            "cloncurry", "hughenden", "richmond", "charters towers", "ayr",
            "bowen", "proserpine", "mackay", "yeppoon", "rockhampton", "gladstone",
            "bundaberg", "hervey bay", "maryborough", "gympie", "nambour"
        ],
        "legal_systems": ["Common Law"],
        "constitution": "Commonwealth of Australia Constitution Act 1900",
        "capital": "Canberra",
        "continent": "Oceania"
    },
    "india": {
        "name": "India",
        "keywords": [
            "india", "indian", "delhi", "mumbai", "kolkata", "chennai",
            "indian constitution", "supreme court india", "parliament india",
            "indian law", "bharat", "hindu law", "muslim law india",
            "personal law india", "indian penal code", "ipc", "crpc",
            "civil procedure code india", "indian contract act", "hindu marriage act",
            "hindu succession act", "muslim personal law", "indian courts",
            "high court india", "district court india", "legal services india",
            "advocate india", "bar council india", "law commission india",
            "bangalore", "hyderabad", "ahmedabad", "pune", "surat", "jaipur",
            "lucknow", "kanpur", "nagpur", "indore", "bhopal", "visakhapatnam",
            "patna", "vadodara", "ludhiana", "agra", "nashik", "faridabad",
            "meerut", "rajkot", "varanasi", "srinagar", "aurangabad", "dhanbad",
            "amritsar", "allahabad", "ranchi", "howrah", "jabalpur", "gwalior",
            "coimbatore", "vijayawada", "jodhpur", "madurai", "raipur", "kota",
            "guwahati", "chandigarh", "solapur", "hubli", "dharwad", "tiruchirappalli",
            "bareilly", "moradabad", "mysore", "tiruppur", "gurgaon", "aligarh",
            "jalandhar", "bhubaneswar", "salem", "warangal", "mira-bhayandar",
            "thiruvananthapuram", "bhiwandi", "saharanpur", "gorakhpur", "guntur",
            "bikaner", "amravati", "noida", "jamshedpur", "bhilai", "cuttack",
            "kochi", "udaipur", "siliguri", "dehradun", "kurnool", "ajmer",
            "jhansi", "ulhasnagar", "davangere", "sangli", "vellore", "kollam"
        ],
        "legal_systems": ["Common Law", "Personal Laws (Hindu, Muslim, etc.)"],
        "constitution": "Constitution of India 1950",
        "capital": "New Delhi",
        "continent": "Asia"
    },
    "kenya": {
        "name": "Kenya",
        "keywords": [
            "kenya", "kenyan", "nairobi", "mombasa", "kisumu",
            "kenyan constitution", "supreme court kenya", "kenyan law",
            "east african community", "kenya gazette", "kenya law reports",
            "penal code kenya", "criminal procedure code kenya", "civil procedure kenya",
            "kenya courts", "high court kenya", "court of appeal kenya",
            "magistrates court kenya", "kadhi court kenya", "kenya legislation",
            "acts of parliament kenya", "kenya subsidiary legislation",
            "nakuru", "eldoret", "thika", "ruiru", "kikuyu", "ngong",
            "kakamega", "kisii", "malindi", "kilifi", "lamu", "garissa",
            "wajir", "mandera", "marsabit", "lodwar", "kitale", "bungoma",
            "busia", "homa bay", "migori", "siaya", "kisii", "nyamira",
            "kericho", "bomet", "narok", "kajiado", "machakos", "makueni",
            "kitui", "meru", "tharaka", "embu", "kirinyaga", "murang'a",
            "nyeri", "kiambu", "turkana", "west pokot", "samburu", "trans nzoia",
            "uasin gishu", "elgeyo marakwet", "nandi", "baringo", "laikipia"
        ],
        "legal_systems": ["Common Law", "Customary Law", "Islamic Law (Kadhi Courts)"],
        "constitution": "Constitution of Kenya 2010",
        "capital": "Nairobi",
        "continent": "Africa"
    },
    "south_africa": {
        "name": "South Africa",
        "keywords": [
            "south africa", "south african", "cape town", "johannesburg", "pretoria",
            "south african constitution", "constitutional court", "south african law",
            "supreme court of appeal sa", "high court sa", "magistrates court sa",
            "south african legislation", "government gazette sa", "acts of parliament sa",
            "common law sa", "roman-dutch law", "customary law sa", "bills of rights sa",
            "durban", "port elizabeth", "bloemfontein", "east london", "pietermaritzburg",
            "polokwane", "nelspruit", "kimberley", "upington", "george", "knysna",
            "mossel bay", "paarl", "stellenbosch", "worcester", "somerset west",
            "strand", "gordons bay", "hermanus", "swellendam", "montagu",
            "robertson", "mcgregor", "barrydale", "ladismith", "calitzdorp",
            "oudtshoorn", "uniondale", "willowmore", "steytlerville", "jansenville",
            "aberdeen", "graaff-reinet", "middelburg", "cradock", "tarkastad",
            "queenstown", "stutterheim", "king william's town", "bisho", "bhisho",
            "east london", "butterworth", "mthatha", "umtata", "kokerboom",
            "upington", "kakamas", "keimoes", "springbok", "calvinia",
            "williston", "fraserburg", "sutherland", "loxton", "carnarvon"
        ],
        "legal_systems": ["Roman-Dutch Law", "Common Law", "Customary Law"],
        "constitution": "Constitution of South Africa 1996",
        "capital": "Pretoria (executive), Cape Town (legislative), Bloemfontein (judicial)",
        "continent": "Africa"
    },
    "nigeria": {
        "name": "Nigeria",
        "keywords": [
            "nigeria", "nigerian", "lagos", "abuja", "kano",
            "nigerian constitution", "supreme court nigeria", "nigerian law",
            "sharia law nigeria", "customary law nigeria", "nigerian legislation",
            "acts of assembly nigeria", "nigerian gazette", "court of appeal nigeria",
            "federal high court nigeria", "state high court nigeria", "sharia court nigeria",
            "customary court nigeria", "magistrates court nigeria", "area court nigeria",
            "ibadan", "benin city", "port harcourt", "jos", "ilorin", "kaduna",
            "enugu", "warri", "aba", "akure", "abeokuta", "owerri", "ife",
            "ondo", "akungba", "ekiti", "osogbo", "ilorin", "minna", "bida",
            "kontagora", "sokoto", "katsina", "dutse", "bauchi", "gombe",
            "yola", "jalingo", "makurdi", "lafia", "keffi", "akwanga",
            "nsukka", "awka", "onitsha", "nnewi", "okigwe", "umuahia",
            "abakaliki", "afikpo", "calabar", "uyo", "ikot ekpene", "oruk"
        ],
        "legal_systems": ["Common Law", "Islamic Law", "Customary Law"],
        "constitution": "Constitution of Nigeria 1999",
        "capital": "Abuja",
        "continent": "Africa"
    },
    "egypt": {
        "name": "Egypt",
        "keywords": [
            "egypt", "egyptian", "cairo", "alexandria", "giza",
            "egyptian constitution", "egyptian law", "supreme court egypt",
            "egyptian civil code", "egyptian penal code", "egyptian courts",
            "court of cassation egypt", "administrative court egypt",
            "sharia law egypt", "personal status law egypt",
            "louxor", "aswan", "sharm el sheikh", "hurghada", "port said",
            "suez", "ismailia", "mansoura", "tanta", "zagazig", "assiut",
            "sohag", "qena", "minya", "beni suef", "faiyum", "damanhur",
            "kafr el sheikh", "damietta", "matruh", "siwa", "oasis"
        ],
        "legal_systems": ["Civil Law", "Islamic Law"],
        "constitution": "Constitution of Egypt 2014",
        "capital": "Cairo",
        "continent": "Africa"
    },
    "sudan": {
        "name": "Sudan",
        "keywords": [
            "sudan", "sudanese", "khartoum", "sudanese law",
            "sudanese constitution", "sharia law sudan", "customary law sudan",
            "sudanese courts", "supreme court sudan", "sudanese penal code",
            "north sudan", "south sudan", "juba", "darfur", "nyala", "el obeid",
            "port sudan", "kassala", "gedaref", "medani", "sennar", "kosti",
            "rabak", "damazin", "ed dueim", "el fasher", "geneina", "zalingei",
            "wad madani", "atbara", "shendi", "dongola", "karima", "merowe"
        ],
        "legal_systems": ["Civil Law", "Islamic Law", "Customary Law"],
        "constitution": "Constitution of Sudan",
        "capital": "Khartoum",
        "continent": "Africa"
    },
    "eritrea": {
        "name": "Eritrea",
        "keywords": [
            "eritrea", "eritrean", "asmara", "eritrean law",
            "eritrean constitution", "eritrean civil code", "eritrean courts",
            "keren", "massawa", "assab", "mendefera", "barentu", "adikeyh",
            "akordat", "tesseney", "nakfa", "afabet", "dekemhare", "segheneyti",
            "nefasit", "ghinda", "zula", "mitsiwa", "dahlak", "dahlak islands"
        ],
        "legal_systems": ["Civil Law", "Customary Law"],
        "constitution": "Constitution of Eritrea",
        "capital": "Asmara",
        "continent": "Africa"
    },
    "somalia": {
        "name": "Somalia",
        "keywords": [
            "somalia", "somali", "mogadishu", "hargeisa", "bosaso",
            "somali law", "somali constitution", "xeer", "sharia law somalia",
            "somaliland", "puntland", "jubaland", "galmudug", "hirshabelle",
            "south west somalia", "banadir", "kismayo", "baidoa", "beledweyne",
            "galkayo", "garowe", "burao", "berbera", "las anod", "erigavo",
            "qardho", "caluula", "bandarbeyla", "hobyo", "harardhere", "cadale",
            "marka", "barawe", "jilib", "jamame", "afgooye", "wanlaweyn"
        ],
        "legal_systems": ["Civil Law", "Islamic Law", "Customary Law (Xeer)"],
        "constitution": "Constitution of Somalia 2012",
        "capital": "Mogadishu",
        "continent": "Africa"
    },
    "djibouti": {
        "name": "Djibouti",
        "keywords": [
            "djibouti", "djiboutian", "djibouti city", "tadjourah", "obock",
            "djiboutian law", "djiboutian constitution", "ali sabieh", "dikhil",
            "arhiba", "khôr 'angar", "loyada", "balho", "dorra", "randouli",
            "assamo", "holhol", "ali addé", "yoboki", "galafi", "moulhoule"
        ],
        "legal_systems": ["Civil Law", "Islamic Law", "Customary Law"],
        "constitution": "Constitution of Djibouti",
        "capital": "Djibouti City",
        "continent": "Africa"
    },
    "europe": {
        "name": "European Union",
        "keywords": [
            "eu", "european union", "european court", "echr", "european law",
            "brussels", "strasbourg", "european commission", "eu law",
            "european parliament", "european council", "court of justice of the eu",
            "cjeu", "european court of human rights", "echr", "eu treaties",
            "treaty of rome", "treaty of maastricht", "treaty of lisbon",
            "schengen", "eurozone", "single market", "acquis communautaire",
            "eu regulations", "eu directives", "eu decisions", "eu charter"
        ],
        "legal_systems": ["Supranational Law"],
        "constitution": "Treaties of the European Union",
        "capital": "Brussels (de facto)",
        "continent": "Europe"
    },
    "china": {
        "name": "China",
        "keywords": [
            "china", "chinese", "beijing", "shanghai", "hong kong",
            "chinese constitution", "chinese law", "supreme court china",
            "national people's congress", "chinese legal system", "socialist law",
            "chinese civil code", "chinese criminal law", "chinese courts",
            "guangzhou", "shenzhen", "tianjin", "chongqing", "chengdu",
            "nanjing", "wuhan", "xi'an", "hangzhou", "ningbo", "qingdao",
            "shenyang", "dalian", "jinan", "zhengzhou", "changsha", "kunming",
            "harbin", "changchun", "fuzhou", "xiamen", "shijiazhuang", "taiyuan",
            "hefei", "nanchang", "nanning", "guiyang", "haikou", "yinchuan",
            "xining", "lanzhou", "urumqi", "lhasa", "macau", "taiwan",
            "taipei", "kaohsiung", "taichung", "tainan", "xinjiang", "tibet"
        ],
        "legal_systems": ["Civil Law", "Socialist Law"],
        "constitution": "Constitution of China 1982",
        "capital": "Beijing",
        "continent": "Asia"
    },
    "russia": {
        "name": "Russia",
        "keywords": [
            "russia", "russian", "moscow", "st petersburg", "novosibirsk",
            "russian constitution", "russian law", "supreme court russia",
            "state duma", "federation council", "russian criminal code",
            "russian civil code", "russian courts", "constitutional court russia",
            "yekaterinburg", "kazan", "nizhny novgorod", "chelyabinsk", "samara",
            "omsk", "rostov-on-don", "ufa", "krasnoyarsk", "voronezh", "perm",
            "volgograd", "saratov", "tolyatti", "barnaul", "izhevsk", "makhachkala",
            "tomsk", "orenburg", "kemerovo", "novokuznetsk", "ryazan", "astrakhan",
            "naberezhnye chelny", "penza", "lipetsk", "kirov", "cheboksary",
            "tula", "kaliningrad", "kursk", "sochi", "ulan-ude", "stavropol"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Russia 1993",
        "capital": "Moscow",
        "continent": "Europe/Asia"
    },
    "france": {
        "name": "France",
        "keywords": [
            "france", "french", "paris", "marseille", "lyon",
            "french constitution", "french law", "code civil", "conseil constitutionnel",
            "cour de cassation", "conseil d'etat", "french legal system",
            "code pénal", "code de procédure pénale", "code de commerce",
            "toulouse", "nice", "nantes", "montpellier", "strasbourg", "bordeaux",
            "lille", "rennes", "reims", "le havre", "saint-étienne", "toulon",
            "grenoble", "dijon", "angers", "nîmes", "villeurbanne", "clermont-ferrand",
            "le mans", "aix-en-provence", "brest", "tours", "amiens", "limoges",
            "annecy", "perpignan", "boulogne-billancourt", "metz", "besançon",
            "orléans", "rouen", "caen", "cannes", "antibes", "versailles"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of France 1958",
        "capital": "Paris",
        "continent": "Europe"
    },
    "germany": {
        "name": "Germany",
        "keywords": [
            "germany", "german", "berlin", "munich", "hamburg",
            "german constitution", "german law", "bundesverfassungsgericht",
            "grundgesetz", "bgb", "stgb", "german civil code", "german criminal code",
            "bundesgerichtshof", "bundesverwaltungsgericht", "german courts",
            "cologne", "frankfurt", "stuttgart", "düsseldorf", "leipzig", "dortmund",
            "essen", "bremen", "dresden", "hanover", "nuremberg", "duisburg",
            "bochum", "wuppertal", "bielefeld", "bonn", "münster", "karlsruhe",
            "mannheim", "augsburg", "wiesbaden", "mönchengladbach", "gelsenkirchen",
            "aachen", "braunschweig", "chemnitz", "kiel", "halle", "magdeburg",
            "freiburg", "krefeld", "mainz", "lübeck", "erfurt", "oberhausen"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Basic Law for the Federal Republic of Germany",
        "capital": "Berlin",
        "continent": "Europe"
    },
    "italy": {
        "name": "Italy",
        "keywords": [
            "italy", "italian", "rome", "milan", "naples",
            "italian constitution", "italian law", "corte costituzionale",
            "corte suprema di cassazione", "italian civil code", "italian penal code",
            "turin", "palermo", "genoa", "bologna", "florence", "bari",
            "catania", "venice", "verona", "messina", "padua", "trieste",
            "taranto", "brescia", "prato", "parma", "modena", "reggio calabria",
            "reggio emilia", "perugia", "livorno", "ravenna", "foggia", "salerno",
            "rimini", "ferrara", "sassari", "siracusa", "pescara", "monza",
            "bergamo", "forlì", "vicenza", "terni", "trento", "bolzano"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Italy 1948",
        "capital": "Rome",
        "continent": "Europe"
    },
    "spain": {
        "name": "Spain",
        "keywords": [
            "spain", "spanish", "madrid", "barcelona", "valencia",
            "spanish constitution", "spanish law", "tribunal constitucional",
            "tribunal supremo", "spanish civil code", "spanish penal code",
            "seville", "zaragoza", "málaga", "murcia", "palma", "las palmas",
            "bilbao", "alicante", "cordoba", "valladolid", "vigo", "gijón",
            "hospitalet", "granada", "elche", "oviedo", "badalona", "terrassa",
            "sabadell", "cartagena", "jerez", "santa cruz", "pamplona",
            "donostia", "almería", "burgos", "salamanca", "logroño", "huelva",
            "cádiz", "jaén", "ourense", "lugo", "santiago", "toledo"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Spanish Constitution 1978",
        "capital": "Madrid",
        "continent": "Europe"
    },
    "brazil": {
        "name": "Brazil",
        "keywords": [
            "brazil", "brazilian", "brasilia", "rio de janeiro", "sao paulo",
            "brazilian constitution", "brazilian law", "supremo tribunal federal",
            "superior tribunal de justiça", "brazilian civil code", "brazilian penal code",
            "salvador", "fortaleza", "belo horizonte", "manaus", "curitiba",
            "recife", "porto alegre", "belém", "goiânia", "guarulhos", "campinas",
            "são luís", "são gonçalo", "maceió", "duque de caxias", "natal",
            "teresina", "campo grande", "são bernardo", "jaboatão", "santo andré",
            "osasco", "joão pessoa", "contagem", "ribeirão preto", "uberlândia",
            "feira de santana", "sorocaba", "niterói", "cuiabá", "aracaju",
            "juiz de fora", "londrina", "joinville", "belford roxo", "santos"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Brazil 1988",
        "capital": "Brasília",
        "continent": "South America"
    },
    "mexico": {
        "name": "Mexico",
        "keywords": [
            "mexico", "mexican", "mexico city", "guadalajara", "monterrey",
            "mexican constitution", "mexican law", "suprema corte mexico",
            "mexican civil code", "mexican penal code", "mexican courts",
            "puebla", "toluca", "tijuana", "ciudad juárez", "cancún", "mérida",
            "san luis potosí", "querétaro", "aguascalientes", "chihuahua",
            "saltillo", "hermosillo", "morelia", "culiacán", "veracruz",
            "xalapa", "villahermosa", "durango", "zacatecas", "oaxaca",
            "acapulco", "chilpancingo", "campeche", "chetumal", "la paz"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Mexico 1917",
        "capital": "Mexico City",
        "continent": "North America"
    },
    "japan": {
        "name": "Japan",
        "keywords": [
            "japan", "japanese", "tokyo", "osaka", "kyoto",
            "japanese constitution", "japanese law", "supreme court japan",
            "japanese civil code", "japanese penal code", "japanese courts",
            "yokohama", "nagoya", "sapporo", "fukuoka", "kobe", "kawasaki",
            "saitama", "hiroshima", "sendai", "chiba", "kitakyushu", "sakai",
            "niigata", "hamamatsu", "kumamoto", "sagamihara", "shizuoka",
            "okayama", "kagoshima", "hachioji", "funabashi", "matsuyama",
            "kurashiki", "nishinomiya", "amagasaki", "fujisawa", "toyama",
            "nagano", "gifu", "takamatsu", "toyohashi", "wakayama", "miyazaki",
            "naha", "aomori", "morioka", "akita", "yamagata", "fukushima"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Japan 1947",
        "capital": "Tokyo",
        "continent": "Asia"
    },
    "south_korea": {
        "name": "South Korea",
        "keywords": [
            "south korea", "korean", "seoul", "busan", "incheon",
            "korean constitution", "korean law", "supreme court korea",
            "constitutional court korea", "korean civil code", "korean penal code",
            "daegu", "daejeon", "gwangju", "suwon", "ulsan", "changwon",
            "goyang", "yongin", "cheongju", "jeonju", "cheonan", "gimhae",
            "pohang", "jeju", "siheung", "hwaseong", "pyeongtaek", "gimpo",
            "guri", "namyangju", "osan", "icheon", "yangju", "uijeongbu",
            "anseong", "dongducheon", "gapyeong", "yeoju", "yeoncheon"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of South Korea 1987",
        "capital": "Seoul",
        "continent": "Asia"
    },
    "turkey": {
        "name": "Turkey",
        "keywords": [
            "turkey", "turkish", "ankara", "istanbul", "izmir",
            "turkish constitution", "turkish law", "anayasa mahkemesi",
            "yargıtay", "turkish civil code", "turkish penal code",
            "bursa", "adana", "gaziantep", "konya", "antalya", "mersin",
            "kayseri", "eskişehir", "diyarbakır", "samsun", "denizli",
            "şanlıurfa", "kahramanmaraş", "malatya", "erzurum", "van",
            "batman", "elazığ", "sakarya", "trabzon", "balıkesir", "manisa",
            "kocaeli", "tekirdağ", "edirne", "kırklareli", "çanakkale"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Turkey 1982",
        "capital": "Ankara",
        "continent": "Asia/Europe"
    },
    "israel": {
        "name": "Israel",
        "keywords": [
            "israel", "israeli", "jerusalem", "tel aviv", "haifa",
            "israeli law", "basic laws israel", "supreme court israel",
            "israeli legal system", "israeli courts", "halakha",
            "rishon lezion", "petah tikva", "ashdod", "netanya", "beersheba",
            "holon", "bnei brak", "ramat gan", "bat yam", "rehovot", "ashkelon",
            "herzliya", "kfar saba", "ra'anana", "modi'in", "lodi", "ramla",
            "nazareth", "eilat", "tiberias", "safed", "akko", "nahariya"
        ],
        "legal_systems": ["Mixed (Common Law, Civil Law, Jewish Law)"],
        "constitution": "Basic Laws of Israel",
        "capital": "Jerusalem",
        "continent": "Asia"
    },
    "saudi_arabia": {
        "name": "Saudi Arabia",
        "keywords": [
            "saudi arabia", "saudi", "riyadh", "jeddah", "mecca",
            "saudi law", "sharia law saudi", "basic law saudi",
            "saudi courts", "sharia courts saudi", "board of grievances",
            "medina", "dammam", "taif", "tabuk", "buraidah", "khamis mushait",
            "abha", "najran", "jizan", "al ahsa", "qatif", "khobar", "dhahran",
            "hail", "arar", "sakaka", "jauf", "qurayyat", "turaif", "rafha"
        ],
        "legal_systems": ["Islamic Law (Sharia)"],
        "constitution": "Basic Law of Saudi Arabia (Qur'an and Sunnah)",
        "capital": "Riyadh",
        "continent": "Asia"
    },
    "uae": {
        "name": "United Arab Emirates",
        "keywords": [
            "uae", "united arab emirates", "dubai", "abu dhabi", "sharjah",
            "emirates law", "uae constitution", "uae law", "dubai courts",
            "dubai international financial centre", "difc", "adgm",
            "ajman", "ras al khaimah", "fujairah", "umm al quwain",
            "al ain", "khorfakkan", "dibba", "kalba", "liwa", "ghayathi"
        ],
        "legal_systems": ["Civil Law", "Islamic Law", "Common Law (in DIFC)"],
        "constitution": "Constitution of the United Arab Emirates",
        "capital": "Abu Dhabi",
        "continent": "Asia"
    },
    "iran": {
        "name": "Iran",
        "keywords": [
            "iran", "iranian", "tehran", "mashhad", "isfahan",
            "iranian law", "iranian constitution", "sharia law iran",
            "supreme court iran", "guardian council", "karaj", "shiraz",
            "tabriz", "qom", "ahvaz", "kermanshah", "urmia", "rasht",
            "zahedan", "hamadan", "yazd", "ardabil", "bandar abbas",
            "arak", "sanandaj", "dezful", "khorramabad", "babol", "sari",
            "gorgan", "bushehr", "birjand", "ilam", "bojnurd", "yasuj"
        ],
        "legal_systems": ["Islamic Law (Sharia)"],
        "constitution": "Constitution of Iran 1979",
        "capital": "Tehran",
        "continent": "Asia"
    },
    "iraq": {
        "name": "Iraq",
        "keywords": [
            "iraq", "iraqi", "baghdad", "basra", "mosul",
            "iraqi constitution", "iraqi law", "sharia law iraq",
            "iraqi courts", "supreme court iraq", "erbil", "sulaymaniyah",
            "duhok", "kirkuk", "najaf", "karbala", "nasiriyah", "amarah",
            "diwaniyah", "samawah", "hillah", "kut", "ramadi", "fallujah",
            "tikrit", "samarra", "baqubah", "zakho", "halabja", "akre"
        ],
        "legal_systems": ["Civil Law", "Islamic Law"],
        "constitution": "Constitution of Iraq 2005",
        "capital": "Baghdad",
        "continent": "Asia"
    },
    "pakistan": {
        "name": "Pakistan",
        "keywords": [
            "pakistan", "pakistani", "karachi", "lahore", "islamabad",
            "pakistani constitution", "pakistani law", "supreme court pakistan",
            "sharia law pakistan", "pakistani penal code", "pakistani courts",
            "faisalabad", "rawalpindi", "multan", "gujranwala", "hyderabad",
            "peshawar", "quetta", "sialkot", "bahawalpur", "sukkur", "larkana",
            "sargodha", "sahiwal", "okara", "sheikhupura", "kasur", "gujrat",
            "mardan", "dera ghazi khan", "mingora", "nawabshah", "jhang"
        ],
        "legal_systems": ["Common Law", "Islamic Law"],
        "constitution": "Constitution of Pakistan 1973",
        "capital": "Islamabad",
        "continent": "Asia"
    },
    "bangladesh": {
        "name": "Bangladesh",
        "keywords": [
            "bangladesh", "bangladeshi", "dhaka", "chittagong", "khulna",
            "bangladeshi law", "bangladeshi constitution", "supreme court bangladesh",
            "bangladeshi courts", "rajshahi", "sylhet", "barisal", "rangpur",
            "mymensingh", "comilla", "narayanganj", "gazipur", "bogra",
            "jessore", "cox's bazar", "tangail", "faridpur", "kishoreganj",
            "bhairab", "sirajganj", "pabna", "kushtia", "magura", "jhenaidah"
        ],
        "legal_systems": ["Common Law", "Islamic Law"],
        "constitution": "Constitution of Bangladesh 1972",
        "capital": "Dhaka",
        "continent": "Asia"
    },
    "sri_lanka": {
        "name": "Sri Lanka",
        "keywords": [
            "sri lanka", "lankan", "colombo", "kandy", "galle",
            "sri lankan law", "sri lankan constitution", "supreme court sri lanka",
            "sri lankan courts", "jaffna", "negombo", "trincomalee", "batticaloa",
            "anuradhapura", "polonnaruwa", "matara", "kalutara", "badulla",
            "ratnapura", "kegalle", "kurunegala", "puttalam", "mannar",
            "vavuniya", "kilinochchi", "mullaitivu", "hambantota", "ampara"
        ],
        "legal_systems": ["Mixed (Common Law, Roman-Dutch Law, Customary Law)"],
        "constitution": "Constitution of Sri Lanka 1978",
        "capital": "Colombo",
        "continent": "Asia"
    },
    "singapore": {
        "name": "Singapore",
        "keywords": [
            "singapore", "singaporean", "singapore law", "singapore constitution",
            "supreme court singapore", "singapore courts", "singapore legislation",
            "singapore penal code", "singapore companies act", "singapore evidence act",
            "jurong", "tampines", "woodlands", "bedok", "hougang", "sengkang",
            "punggol", "yishun", "ang mo kio", "toa payoh", "queenstown",
            "bukit timah", "clementi", "changi", "sentosa", "tuas", "bukit panjang"
        ],
        "legal_systems": ["Common Law"],
        "constitution": "Constitution of Singapore 1965",
        "capital": "Singapore",
        "continent": "Asia"
    },
    "malaysia": {
        "name": "Malaysia",
        "keywords": [
            "malaysia", "malaysian", "kuala lumpur", "putrajaya", "johor bahru",
            "malaysian law", "malaysian constitution", "federal court malaysia",
            "malaysian courts", "sharia law malaysia", "penang", "ipoh",
            "shah alam", "petaling jaya", "klang", "subang jaya", "kuching",
            "kota kinabalu", "melaka", "alor setar", "seremban", "kuantan",
            "kota bharu", "kuala terengganu", "kangar", "muar", "batu pahat",
            "segamat", "taiping", "kuala selangor", "port klang", "cyberjaya"
        ],
        "legal_systems": ["Common Law", "Islamic Law"],
        "constitution": "Constitution of Malaysia 1957",
        "capital": "Kuala Lumpur",
        "continent": "Asia"
    },
    "indonesia": {
        "name": "Indonesia",
        "keywords": [
            "indonesia", "indonesian", "jakarta", "surabaya", "bandung",
            "indonesian law", "indonesian constitution", "supreme court indonesia",
            "constitutional court indonesia", "indonesian courts",
            "medan", "bogor", "semarang", "palembang", "makassar", "batam",
            "pekanbaru", "denpasar", "yogyakarta", "malang", "samarinda",
            "banjarmasin", "tangerang", "depok", "bekasi", "south jakarta",
            "east jakarta", "central jakarta", "west jakarta", "north jakarta",
            "bandar lampung", "padang", "manado", "ambon", "jayapura"
        ],
        "legal_systems": ["Civil Law", "Customary Law", "Islamic Law"],
        "constitution": "Constitution of Indonesia 1945",
        "capital": "Jakarta",
        "continent": "Asia"
    },
    "philippines": {
        "name": "Philippines",
        "keywords": [
            "philippines", "filipino", "manila", "quezon city", "cebu",
            "philippine law", "philippine constitution", "supreme court philippines",
            "philippine courts", "civil code philippines", "revised penal code",
            "davao", "caloocan", "zamboanga", "bacolod", "cagayan de oro",
            "pasig", "pasay", "las piñas", "makati", "taguig", "mandaluyong",
            "marikina", "muntinlupa", "valenzuela", "parañaque", "malabon",
            "navotas", "san juan", "tagaytay", "antipolo", "batangas",
            "lucena", "iligan", "butuan", "general santos", "cotabato"
        ],
        "legal_systems": ["Mixed (Civil Law, Common Law, Islamic Law)"],
        "constitution": "Constitution of the Philippines 1987",
        "capital": "Manila",
        "continent": "Asia"
    },
    "thailand": {
        "name": "Thailand",
        "keywords": [
            "thailand", "thai", "bangkok", "chiang mai", "phuket",
            "thai law", "thai constitution", "supreme court thailand",
            "constitutional court thailand", "thai courts", "thai civil code",
            "thai penal code", "nakhon ratchasima", "khon kaen", "hat yai",
            "udon thani", "chonburi", "pattaya", "nakhon si thammarat",
            "surat thani", "songkhla", "nakhon pathom", "samut prakan",
            "samut sakhon", "pathum thani", "nonthaburi", "ayutthaya",
            "lampang", "ubon ratchathani", "loei", "mae hong son", "trat"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Thailand 2017",
        "capital": "Bangkok",
        "continent": "Asia"
    },
    "vietnam": {
        "name": "Vietnam",
        "keywords": [
            "vietnam", "vietnamese", "hanoi", "ho chi minh city", "da nang",
            "vietnamese law", "vietnamese constitution", "supreme court vietnam",
            "vietnamese courts", "vietnamese civil code", "vietnamese penal code",
            "hai phong", "can tho", "nha trang", "buon ma thuot", "vung tau",
            "quy nhon", "hue", "da lat", "tay ninh", "my tho", "long xuyen",
            "rach gia", "ca mau", "bac lieu", "soc trang", "tra vinh", "ben tre",
            "tien giang", "dong thap", "an giang", "kien giang", "vinh long"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Vietnam 2013",
        "capital": "Hanoi",
        "continent": "Asia"
    },
    "argentina": {
        "name": "Argentina",
        "keywords": [
            "argentina", "argentine", "buenos aires", "cordoba", "rosario",
            "argentine law", "argentine constitution", "supreme court argentina",
            "argentine civil code", "argentine penal code", "mendoza",
            "la plata", "tucumán", "mar del plata", "salta", "santa fe",
            "san juan", "resistencia", "santiago del estero", "corrientes",
            "neuquén", "posadas", "san salvador de jujuy", "paraná",
            "formosa", "san luis", "catamarca", "la rioja", "río cuarto",
            "concepción del uruguay", "gualeguaychú", "punta alta", "bahía blanca"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Argentina 1853",
        "capital": "Buenos Aires",
        "continent": "South America"
    },
    "chile": {
        "name": "Chile",
        "keywords": [
            "chile", "chilean", "santiago", "valparaíso", "concepción",
            "chilean law", "chilean constitution", "supreme court chile",
            "chilean civil code", "chilean penal code", "la serena",
            "antofagasta", "temuco", "rancagua", "talca", "arica",
            "iquique", "calama", "copiapó", "coquimbo", "valdivia",
            "osorno", "puerto montt", "coyhaique", "punta arenas",
            "viña del mar", "quilpué", "peñaflor", "melipilla", "buin"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Chile 1980",
        "capital": "Santiago",
        "continent": "South America"
    },
    "colombia": {
        "name": "Colombia",
        "keywords": [
            "colombia", "colombian", "bogotá", "medellín", "cali",
            "colombian law", "colombian constitution", "constitutional court colombia",
            "supreme court colombia", "colombian civil code", "colombian penal code",
            "barranquilla", "cartagena", "cúcuta", "bucaramanga", "ibagué",
            "pereira", "santa marta", "villavicencio", "pasto", "manizales",
            "neiva", "armenia", "popayán", "sincelejo", "montería",
            "valledupar", "rioacha", "quibdó", "leticia", "san andrés"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Colombia 1991",
        "capital": "Bogotá",
        "continent": "South America"
    },
    "peru": {
        "name": "Peru",
        "keywords": [
            "peru", "peruvian", "lima", "arequipa", "trujillo",
            "peruvian law", "peruvian constitution", "constitutional court peru",
            "supreme court peru", "peruvian civil code", "peruvian penal code",
            "chiclayo", "piura", "cusco", "huancayo", "iquitos", "pucallpa",
            "tacna", "juliaca", "sullana", "cajamarca", "ayacucho",
            "chincha", "huánuco", "puno", "tarapoto", "moquegua", "tumbes"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Peru 1993",
        "capital": "Lima",
        "continent": "South America"
    },
    "venezuela": {
        "name": "Venezuela",
        "keywords": [
            "venezuela", "venezuelan", "caracas", "maracaibo", "valencia",
            "venezuelan law", "venezuelan constitution", "supreme court venezuela",
            "venezuelan civil code", "venezuelan penal code", "barquisimeto",
            "ciudad guayana", "maturín", "barcelona", "maracay", "petare",
            "turmero", "ciudad bolívar", "cumaná", "mérida", "san cristóbal",
            "cabimas", "coro", "guanare", "acarigua", "puerto la cruz"
        ],
        "legal_systems": ["Civil Law"],
        "constitution": "Constitution of Venezuela 1999",
        "capital": "Caracas",
        "continent": "South America"
    }
}

# ============================================
# INTERNATIONAL LEGAL BODIES
# ============================================

INTERNATIONAL_LEGAL_BODIES = {
    "un": {
        "name": "United Nations",
        "keywords": [
            "un", "united nations", "unga", "unsc", "united nations charter",
            "un general assembly", "un security council", "un secretariat",
            "international court of justice", "icj", "un human rights council",
            "unhcr", "unicef", "undp", "un women", "who", "ilo", "unesco",
            "united nations headquarters", "new york", "geneva", "vienna"
        ],
        "instruments": ["Universal Declaration of Human Rights", "UN Charter", "International Covenants"]
    },
    "icj": {
        "name": "International Court of Justice",
        "keywords": [
            "icj", "international court of justice", "world court", "hague",
            "peace palace", "statute of the icj", "contentious cases",
            "advisory opinions", "international disputes"
        ]
    },
    "icc": {
        "name": "International Criminal Court",
        "keywords": [
            "icc", "international criminal court", "rome statute", "hague",
            "war crimes", "crimes against humanity", "genocide",
            "aggression", "international criminal law"
        ]
    },
    "ictr": {
        "name": "International Criminal Tribunal for Rwanda",
        "keywords": [
            "ictr", "international criminal tribunal for rwanda",
            "rwanda tribunal", "genocide rwanda", "arusha"
        ]
    },
    "icty": {
        "name": "International Criminal Tribunal for the former Yugoslavia",
        "keywords": [
            "icty", "international criminal tribunal for yugoslavia",
            "yugoslavia tribunal", "the hague", "balkan crimes"
        ]
    },
    "achpr": {
        "name": "African Commission on Human and Peoples' Rights",
        "keywords": [
            "achpr", "african commission", "banjul charter",
            "african human rights", "african charter", "banjul"
        ]
    },
    "african_court": {
        "name": "African Court on Human and Peoples' Rights",
        "keywords": [
            "african court", "achpr court", "arusha", "african human rights court",
            "protocol to the african charter", "african court of justice"
        ]
    },
    "au": {
        "name": "African Union",
        "keywords": [
            "au", "african union", "addis ababa", "african union law",
            "african union commission", "assembly of the union",
            "peace and security council", "pan african parliament"
        ]
    },
    "igad": {
        "name": "Intergovernmental Authority on Development",
        "keywords": [
            "igad", "intergovernmental authority on development", "djibouti",
            "east africa", "horn of africa", "drought and development"
        ]
    },
    "comesa": {
        "name": "Common Market for Eastern and Southern Africa",
        "keywords": [
            "comesa", "common market for eastern and southern africa",
            "lusaka", "regional integration", "eastern and southern africa"
        ]
    },
    "eac": {
        "name": "East African Community",
        "keywords": [
            "eac", "east african community", "arusha", "east african law",
            "east african court of justice", "eac treaty", "east african integration",
            "kenya", "tanzania", "uganda", "rwanda", "burundi", "south sudan"
        ]
    },
    "ecowas": {
        "name": "Economic Community of West African States",
        "keywords": [
            "ecowas", "economic community of west african states", "abuja",
            "ecowas court of justice", "west africa", "cedeo"
        ]
    },
    "sadc": {
        "name": "Southern African Development Community",
        "keywords": [
            "sadc", "southern african development community", "gaborone",
            "sadc tribunal", "southern africa"
        ]
    },
    "eu": {
        "name": "European Union",
        "keywords": [
            "eu", "european union", "european court", "echr", "european law",
            "brussels", "strasbourg", "european commission", "eu law",
            "european parliament", "european council", "court of justice of the eu",
            "cjeu", "european court of human rights", "echr"
        ]
    },
    "council_of_europe": {
        "name": "Council of Europe",
        "keywords": [
            "council of europe", "coe", "strasbourg", "echr",
            "european convention on human rights", "venice commission"
        ]
    },
    "oas": {
        "name": "Organization of American States",
        "keywords": [
            "oas", "organization of american states", "washington dc",
            "inter-american commission", "inter-american court", "iachr",
            "american convention on human rights", "pact of san jose"
        ]
    },
    "inter_american_court": {
        "name": "Inter-American Court of Human Rights",
        "keywords": [
            "inter-american court", "inter-american court of human rights",
            "san jose", "costa rica", "iachr court"
        ]
    },
    "asean": {
        "name": "Association of Southeast Asian Nations",
        "keywords": [
            "asean", "association of southeast asian nations", "jakarta",
            "asean charter", "asean law", "southeast asia", "asean community"
        ]
    },
    "wto": {
        "name": "World Trade Organization",
        "keywords": [
            "wto", "world trade organization", "geneva", "international trade law",
            "gatt", "trade agreements", "dispute settlement body"
        ]
    },
    "imf": {
        "name": "International Monetary Fund",
        "keywords": [
            "imf", "international monetary fund", "washington dc",
            "bretton woods", "financial stability", "monetary policy"
        ]
    },
    "world_bank": {
        "name": "World Bank",
        "keywords": [
            "world bank", "international bank for reconstruction and development",
            "ibrd", "ida", "washington dc", "development law"
        ]
    },
    "icsid": {
        "name": "International Centre for Settlement of Investment Disputes",
        "keywords": [
            "icsid", "investment disputes", "arbitration", "washington dc",
            "foreign investment", "investor-state arbitration"
        ]
    },
    "pca": {
        "name": "Permanent Court of Arbitration",
        "keywords": [
            "pca", "permanent court of arbitration", "the hague",
            "international arbitration", "peace palace"
        ]
    },
    "icrc": {
        "name": "International Committee of the Red Cross",
        "keywords": [
            "icrc", "international committee of the red cross", "geneva",
            "international humanitarian law", "geneva conventions",
            "red cross", "red crescent"
        ]
    },
    "ilo": {
        "name": "International Labour Organization",
        "keywords": [
            "ilo", "international labour organization", "geneva",
            "international labour law", "labour standards", "decent work"
        ]
    },
    "who": {
        "name": "World Health Organization",
        "keywords": [
            "who", "world health organization", "geneva",
            "international health law", "health regulations", "pandemic"
        ]
    },
    "wipo": {
        "name": "World Intellectual Property Organization",
        "keywords": [
            "wipo", "world intellectual property organization", "geneva",
            "intellectual property law", "copyright", "patents", "trademarks"
        ]
    },
    "unidroit": {
        "name": "International Institute for the Unification of Private Law",
        "keywords": [
            "unidroit", "international institute for unification of private law",
            "rome", "private international law", "uniform law"
        ]
    },
    "hague_conference": {
        "name": "Hague Conference on Private International Law",
        "keywords": [
            "hague conference", "hague conference on private international law",
            "hague conventions", "private international law", "the hague"
        ]
    }
}

# ============================================
# CONTINENTS AND REGIONS
# ============================================

CONTINENTS = {
    "africa": {
        "name": "Africa",
        "countries": ["kenya", "south_africa", "nigeria", "egypt", "sudan", "eritrea", "somalia", "djibouti"]
    },
    "asia": {
        "name": "Asia",
        "countries": ["india", "china", "japan", "south_korea", "turkey", "israel", "saudi_arabia", "uae", "iran", "iraq", "pakistan", "bangladesh", "sri_lanka", "singapore", "malaysia", "indonesia", "philippines", "thailand", "vietnam"]
    },
    "europe": {
        "name": "Europe",
        "countries": ["uk", "france", "germany", "italy", "spain", "russia"]
    },
    "north_america": {
        "name": "North America",
        "countries": ["usa", "canada", "mexico"]
    },
    "south_america": {
        "name": "South America",
        "countries": ["brazil", "argentina", "chile", "colombia", "peru", "venezuela"]
    },
    "oceania": {
        "name": "Oceania",
        "countries": ["australia"]
    }
}

# ============================================
# FUNCTION TO DETECT COUNTRY FROM QUERY
# ============================================

def detect_country(query):
    """
    Detect which country's law a query refers to
    Returns: (country_code, country_name, confidence, detected_keywords, all_detected)
    """
    query_lower = query.lower()
    detected_countries = []
    
    for code, country in FOREIGN_JURISDICTIONS.items():
        matches = []
        for keyword in country["keywords"]:
            if keyword in query_lower:
                matches.append(keyword)
        
        if matches:
            # Calculate confidence based on matches
            base_confidence = min(len(matches) * 10, 80)  # 10% per match, max 80%
            
            # Boost confidence if legal terms are found
            legal_terms = ["constitution", "law", "court", "legal", "supreme", "code", "penal", "civil"]
            for term in legal_terms:
                if term in query_lower and any(match in query_lower for match in matches[:3]):
                    base_confidence += 10
                    break
            
            confidence = min(base_confidence, 100)
            
            detected_countries.append({
                "code": code,
                "name": country["name"],
                "confidence": confidence,
                "matches": matches,
                "match_count": len(matches),
                "legal_systems": country["legal_systems"],
                "constitution": country["constitution"],
                "capital": country.get("capital", ""),
                "continent": country.get("continent", "")
            })
    
    # Sort by confidence (highest first) and match count
    detected_countries.sort(key=lambda x: (x["confidence"], x["match_count"]), reverse=True)
    
    if detected_countries:
        top = detected_countries[0]
        return (
            top["code"], 
            top["name"], 
            top["confidence"], 
            top["matches"], 
            detected_countries
        )
    
    return None, None, 0, [], []

# ============================================
# FUNCTION TO CHECK IF QUERY IS INTERNATIONAL LAW
# ============================================

def is_international_law(query):
    """
    Check if query refers to international law
    Returns: (is_international, body_name, matched_keywords)
    """
    query_lower = query.lower()
    detected_bodies = []
    
    for code, body in INTERNATIONAL_LEGAL_BODIES.items():
        matches = []
        for keyword in body["keywords"]:
            if keyword in query_lower:
                matches.append(keyword)
        
        if matches:
            detected_bodies.append({
                "code": code,
                "name": body["name"],
                "matches": matches,
                "instruments": body.get("instruments", [])
            })
    
    if detected_bodies:
        # Check for general international law terms
        general_terms = [
            "international law", "treaty", "convention", "protocol",
            "customary international law", "jus cogens", "erga omnes",
            "international humanitarian law", "international human rights law",
            "law of the sea", "international criminal law", "diplomatic law",
            "international environmental law", "international trade law"
        ]
        
        for term in general_terms:
            if term in query_lower:
                return True, "International Law", [term], detected_bodies
        
        return True, detected_bodies[0]["name"], detected_bodies[0]["matches"], detected_bodies
    
    return False, None, [], []

# ============================================
# FUNCTION TO GENERATE JURISDICTION WARNING
# ============================================

def generate_jurisdiction_warning(country_code, country_name, query):
    """
    Generate a warning message for foreign jurisdiction queries
    Returns warning messages in both English and Amharic
    """
    warnings = {
        "english": f"This query appears to reference {country_name} law. This platform provides information on Ethiopian law only. For {country_name} law, please consult a legal professional in that jurisdiction.",
        "amharic": f"ይህ ጥያቄ የ{country_name} ህግን የሚመለከት ይመስላል። ይህ መድረክ የኢትዮጵያ ህግ መረጃ ብቻ ይሰጣል። ለ{country_name} ህግ፣ እባክዎን በዚያ አገር ያለ የህግ ባለሙያ ያማክሩ።"
    }
    
    return warnings

# ============================================
# FUNCTION TO GENERATE INTERNATIONAL LAW WARNING
# ============================================

def generate_international_warning(body_name):
    """
    Generate a warning message for international law queries
    Returns warning messages in both English and Amharic
    """
    warnings = {
        "english": f"This query appears to reference {body_name}. This platform focuses on Ethiopian domestic law. International law references are provided for informational purposes only.",
        "amharic": f"ይህ ጥያቄ {body_name}ን የሚመለከት ይመስላል። ይህ መድረክ በኢትዮጵያ ሀገር ውስጥ ህግ ላይ ያተኩራል። ዓለም አቀፍ የህግ ማጣቀሻዎች ለመረጃ ዓላማ ብቻ ቀርበዋል።"
    }
    
    return warnings

# ============================================
# FUNCTION TO GET COUNTRY INFO BY CODE
# ============================================

def get_country_info(country_code):
    """
    Get detailed information about a country by its code
    """
    return FOREIGN_JURISDICTIONS.get(country_code)

# ============================================
# FUNCTION TO GET ALL COUNTRIES BY CONTINENT
# ============================================

def get_countries_by_continent(continent):
    """
    Get all countries in a specific continent
    """
    continent_data = CONTINENTS.get(continent.lower())
    if continent_data:
        countries = []
        for country_code in continent_data["countries"]:
            if country_code in FOREIGN_JURISDICTIONS:
                countries.append({
                    "code": country_code,
                    "name": FOREIGN_JURISDICTIONS[country_code]["name"],
                    "legal_systems": FOREIGN_JURISDICTIONS[country_code]["legal_systems"]
                })
        return countries
    return []

# ============================================
# FUNCTION TO DETECT MIXED JURISDICTION
# ============================================

def detect_mixed_jurisdiction(query):
    """
    Detect if query contains multiple jurisdictions
    Returns list of detected jurisdictions
    """
    from ethiopian_constitution import is_ethiopian_legal_query
    
    jurisdictions = []
    
    # Check Ethiopian
    ethiopian_match = is_ethiopian_legal_query(query)
    if ethiopian_match:
        jurisdictions.append({
            "code": "et",
            "name": "Ethiopia",
            "type": "domestic"
        })
    
    # Check foreign
    country_code, country_name, confidence, matches, all_detected = detect_country(query)
    if all_detected:
        for country in all_detected[:3]:  # Top 3 foreign jurisdictions
            jurisdictions.append({
                "code": country["code"],
                "name": country["name"],
                "confidence": country["confidence"],
                "type": "foreign"
            })
    
    # Check international
    is_intl, body_name, matches, bodies = is_international_law(query)
    if bodies:
        for body in bodies[:3]:  # Top 3 international bodies
            jurisdictions.append({
                "code": body["code"],
                "name": body["name"],
                "type": "international"
            })
    
    return jurisdictions

# ============================================
# FUNCTION TO GET ALL FOREIGN JURISDICTIONS
# ============================================

def get_all_foreign_jurisdictions():
    """
    Get list of all foreign jurisdictions
    """
    jurisdictions = []
    for code, country in FOREIGN_JURISDICTIONS.items():
        jurisdictions.append({
            "code": code,
            "name": country["name"],
            "legal_systems": country["legal_systems"],
            "constitution": country["constitution"],
            "continent": country.get("continent", "")
        })
    return sorted(jurisdictions, key=lambda x: x["name"])

# ============================================
# FUNCTION TO GET ALL INTERNATIONAL BODIES
# ============================================

def get_all_international_bodies():
    """
    Get list of all international legal bodies
    """
    bodies = []
    for code, body in INTERNATIONAL_LEGAL_BODIES.items():
        bodies.append({
            "code": code,
            "name": body["name"],
            "instruments": body.get("instruments", [])
        })
    return sorted(bodies, key=lambda x: x["name"])

# ============================================
# EXPORTS
# ============================================

__all__ = [
    'FOREIGN_JURISDICTIONS',
    'INTERNATIONAL_LEGAL_BODIES',
    'CONTINENTS',
    'detect_country',
    'is_international_law',
    'generate_jurisdiction_warning',
    'generate_international_warning',
    'get_country_info',
    'get_countries_by_continent',
    'detect_mixed_jurisdiction',
    'get_all_foreign_jurisdictions',
    'get_all_international_bodies'
]