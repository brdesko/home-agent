// ─── Types ────────────────────────────────────────────────────────────────────

export type PlotStatus = 'planning' | 'growing' | 'harvest' | 'done'
export type PlantType  = 'seed' | 'transplant'

export type PlotInfo = {
  name:            string
  defaultPlantType: PlantType | null
  info:            string
}

export type PlantDetail = {
  img:        string
  yield:      string
  taste:      string
  appearance: string
}

export type GanttRow = {
  group:   string
  name:    string
  sub:     string
  sow:     number
  grow:    number
  harvest: number
  end:     number
}

export type GanttStages = Record<string, { sow: string; grow: string; harvest: string }>

export type Task = {
  id:       string
  text:     string
  tag:      string
  urgent:   boolean
  purchase: boolean
  done:     boolean
}

export type LogEntry = { date: string; text: string }

export type PlotImage = { id: string; title: string; data: string }

export type Purchase = {
  id:     string
  taskId: string
  item:   string
  cost:   number
  scope:  string
  notes:  string
  date:   string
}

export type GardenData = {
  plotStatuses:    Record<string, PlotStatus>
  plotConfidence:  Record<string, number>
  plotImages:      Record<string, PlotImage[]>
  plantTypes:      Record<string, PlantType>
  plotLabels:      Record<string, string>   // user-overridden display name per plot
  plotThemes:      Record<string, string>   // user-overridden color theme per plot
  logs:            Record<string, LogEntry[]>
  tasks:           Task[]
  tasksGenerated:  string | null
  panelChatHistory: Record<string, { role: string; content: string }[]>
  purchases:       Purchase[]
  timeline:        GanttRow[] | null
}

export function defaultData(): GardenData {
  return {
    plotStatuses: {}, plotConfidence: {}, plotImages: {}, plantTypes: {},
    plotLabels: {}, plotThemes: {},
    logs: {}, tasks: [], tasksGenerated: null, panelChatHistory: {}, purchases: [], timeline: null,
  }
}

// ─── Plot definitions ─────────────────────────────────────────────────────────

export const PLOTS: Record<string, PlotInfo> = {
  roma:          { name: 'Roma Tomato',                   defaultPlantType: 'transplant', info: 'Paste tomato — meaty, low moisture, ideal for sauce and roasting. Transplant after May 1. Row 1 (north, 3ft). 3 plants × 24" spacing. Place heavy-duty 60"+ cage at planting. Peak harvest Aug–Sep. Freezes well. Semi-determinate.' },
  sanmarzano:    { name: 'San Marzano Tomato',            defaultPlantType: 'transplant', info: 'Italian heirloom paste tomato — elongated plum shape, few seeds, intensely sweet and dense. Transplant after May 1. Row 1 (north, 3ft). 1 plant × 24" spacing. Cage at planting. Peak harvest Aug–Sep. Best for sauce and canning. Indeterminate.' },
  sunrisebee:    { name: 'Sunrise Bumble Bee Tomato',     defaultPlantType: 'transplant', info: 'Bi-color cherry tomato — yellow-orange with red blush and stripes. Sweet, fruity, tropical flavor. Transplant after May 1. Row 1 (north, 3ft). 1 plant × 24" spacing. Cage at planting. Harvest mid-July. Very prolific. Indeterminate.' },
  cherokee:      { name: 'Cherokee Purple Tomato',        defaultPlantType: 'transplant', info: 'Heirloom — dusky rose/brick color, rich smoky flavor, lower acidity. Transplant after May 1. Row 1 (north, 3ft). 1 plant × 24" spacing. Heavy-duty cage at planting. Peak harvest Aug–Sep. Call Spring Valley Nurseries ahead. Indeterminate.' },
  sweet100:      { name: 'Sweet 100 Cherry Tomato',       defaultPlantType: 'transplant', info: 'Classic cherry tomato — very prolific, clusters of 20–30 bright red fruits. Sweet and tangy. Transplant after May 1. Row 1 (north, 3ft). 3 plants × 24" spacing. Cage at planting. Harvest mid-July through frost. Indeterminate.' },
  pepperoncini:  { name: 'Pepperoncini Pepper',           defaultPlantType: 'transplant', info: 'Mild, tangy Italian pepper (100–500 SHU) — classic pickled/sandwich pepper. Transplant after May 1. Row 2 (1.5ft). 2 plants, 18" spacing single-file. Bamboo stake. Harvest yellow-green. Very prolific — 25–50 fruits per plant.' },
  hungarianhot:  { name: 'Hungarian Hot Wax Pepper',      defaultPlantType: 'transplant', info: 'Medium heat (5,000–10,000 SHU) — long tapered yellow pepper that ripens to red. Great fresh, pickled, or stuffed. Transplant after May 1. Row 2 (1.5ft). 2 plants, 18" spacing. Bamboo stake. Harvest yellow for mild, red for hot.' },
  chocolatebell: { name: 'Chocolate Bell Pepper',         defaultPlantType: 'transplant', info: 'Sweet bell pepper — ripens to rich chocolate-brown mahogany. Deep, complex sweetness when fully colored. Must wait until fully brown. Transplant after May 1. Row 2 (1.5ft). 1 plant, 18" spacing. Bamboo stake. Harvest Aug–Sep.' },
  sweetbanana:   { name: 'Sweet Banana Pepper',           defaultPlantType: 'transplant', info: 'Mild, sweet, long tapered pepper (0–500 SHU). Harvest yellow-green. Transplant after May 1. Row 2 (1.5ft). 3 plants, 18" spacing. Bamboo stake. Very prolific from July through frost.' },
  orangeblaze:   { name: 'Orange Blaze Bell Pepper',      defaultPlantType: 'transplant', info: 'Compact orange bell — matures faster than most bells (60–65 days), very sweet when fully orange. Transplant after May 1. Row 2 (1.5ft). 1 plant, 18" spacing. Bamboo stake. Harvest when fully orange for peak flavor.' },
  candycane:     { name: 'Candy Cane Chocolate Cherry Pepper', defaultPlantType: 'transplant', info: 'Decorative striped cherry pepper — chocolate-brown with cream/red stripes, sweet and mild. Transplant after May 1. Row 2 (1.5ft). 1 plant, 18" spacing. Bamboo stake. Harvest when fully striped and colored.' },
  hotcherry:     { name: 'Hot Cherry Pepper',             defaultPlantType: 'transplant', info: 'Round cherry-shaped hot pepper (2,500–5,000 SHU) — great for pickling and fresh use. Transplant after May 1. Row 2 (1.5ft). 4 plants, 18" spacing. Bamboo stake. Harvest when deep red. Very prolific.' },
  tastygreen:    { name: 'Tasty Green Hybrid Cucumber',   defaultPlantType: 'seed',       info: 'Compact slicing cucumber — sweet, crisp, almost seedless. Direct sow after May 1. Row 3 (3ft). 4/10 of row length, 12" spacing along trellis. Harvest at 6–7". Pick every 2–3 days — skipping stops production. Trellis MUST be installed first.' },
  springburpless:{ name: 'Spring Burpless Cucumber',      defaultPlantType: 'seed',       info: '"Burpless" — low cucurbitacin, no digestive discomfort. Thin skin, sweet. Direct sow after May 1. Row 3 (3ft). 4/10 of row length, 12" spacing along trellis. Harvest at 8–10". Very vigorous vine. Pick regularly.' },
  patiosnacker:  { name: 'Patio Snacker Cucumber',        defaultPlantType: 'transplant', info: 'Compact-vine cucumber — great for smaller spaces. Crisp, 4–5" snacking fruits. Transplant after May 1. Row 3 (3ft). 1/5 of row length (far end), 12" spacing along trellis. Harvest frequently to keep plant producing.' },
  scarletnantes: { name: 'Scarlet Nantes Carrot',         defaultPlantType: 'seed',       info: 'Classic sweet orange carrot — blunt-tipped, very tender. Direct sow. Row 4 (1.5ft). 2/5 of row. Thin to 3" after sprouting. CRITICAL: needs loose, rock-free soil to 12" deep with compost + perlite. Harvest July–Aug.' },
  rainbow:       { name: 'Rainbow Blend Carrots',          defaultPlantType: 'seed',       info: 'Mix of orange, yellow, purple, and white carrots — same care as Scarlet Nantes. Direct sow. Row 4 (1.5ft). 2/5 of row. Label sections clearly — all look identical above ground. Harvest July–Aug.' },
  genericcarrot: { name: 'Garden Carrot',                 defaultPlantType: 'transplant', info: 'Transplant carrot starts. Row 4 (1.5ft). 1/5 of row (far end). 3" spacing after establishment. Keep moist. Handle roots gently. Harvest when tops are 8–12" tall.' },
  burpeebibb:    { name: 'Burpee Bibb Lettuce',           defaultPlantType: 'seed',       info: 'Classic bibb/butterhead — soft, mild, slightly sweet. Direct sow. Row 5 (south, 3ft). 1/3 of row, 8–10" spacing. Matures faster — first heads late May. Harvest before summer heat.' },
  giantcaesar:   { name: 'Giant Caesar Romaine',          defaultPlantType: 'seed',       info: 'Large upright romaine — thick ribs, exceptional crunch. Direct sow. Row 5 (south, 3ft). 1/3 of row, 10" spacing. Larger and slower than Bibb — full heads by mid-June. Bolts in midsummer heat.' },
  redromaine:    { name: 'Red Romaine Lettuce',           defaultPlantType: 'transplant', info: 'Red-tipped romaine — beautiful color, same crisp texture as green romaine. 6 transplants. Row 5 (south, 3ft). 1/3 of row, 10" spacing. Harvest outer leaves first for continuous yield.' },
  bokchoy:       { name: 'Bok Choy',                     defaultPlantType: 'transplant', info: 'Fast-growing Asian green — 30–45 days. 6 transplants. Mixed veg column (top quarter). 8" spacing. Loves cool weather — plant now, harvest before summer heat.' },
  arugula:       { name: 'Arugula',                       defaultPlantType: 'transplant', info: 'Peppery salad green — 40 days from transplant. 6 transplants. Mixed veg column (second quarter). 6" spacing. Best in cool weather; bolts and turns bitter when hot.' },
  cantaloupe:    { name: 'Cantaloupe',                    defaultPlantType: 'seed',       info: 'Vining melon — needs 70–90 warm days. Direct sow after soil warms (mid-May). Mixed veg column (third quarter). 1 hill per section. Ripe when stem slips easily.' },
  poblano:       { name: 'Poblano Pepper',                defaultPlantType: 'transplant', info: 'Mild to medium heat (1,000–2,000 SHU) — large, dark green pepper excellent for roasting, stuffing, and making chile rellenos. 4 transplants. Mixed veg column (bottom quarter). 18" spacing. Bamboo stake.' },
  earlysunglow:  { name: 'Early Sunglow Hybrid Corn',    defaultPlantType: 'seed',       info: 'Early-season sweet corn — ready in 62–65 days. Direct sow May 1. 2 columns (cols 2–3 of 6). 12" grid in each 3×14ft column — ~28 plants total. Ready early July.' },
  silverqueen:   { name: 'Silver Queen Corn',            defaultPlantType: 'seed',       info: 'Classic white sweet corn — legendary sweetness, milky tender kernels. Direct sow May 1. 3 columns (cols 4–6 of 6). 12" grid — ~42 plants. Ready late July–Aug (92 days).' },
  garden:        { name: 'Whole Garden',                 defaultPlantType: null,         info: 'Durham Kitchen Garden — ~46ft wide × 22ft deep, south-facing. Zone 6b. Last frost ~April 15. First fall frost ~October 15. ~183 growing days.' },
}

// ─── Plant details (Details tab) ──────────────────────────────────────────────

export const PLANT_DETAILS: Record<string, PlantDetail> = {
  roma:          { img: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Roma_tomatoes.jpg', yield: '30–50+ fruits per plant, steady from August through frost. 3 plants in your garden.', taste: 'Dense, meaty, low-moisture flesh with mild balanced flavor. Ideal for sauce, paste, roasting, and canning — freezes beautifully.', appearance: 'Plum-shaped, 2–3" long, bright red with thick walls and small seed cavities. Stays firm after cooking.' },
  sanmarzano:    { img: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Roma_tomatoes.jpg', yield: '20–40 fruits per plant from August through frost. 1 plant in your garden.', taste: 'Sweeter and less acidic than standard Roma. Dense, dry flesh with very few seeds — the gold standard for Italian tomato sauce.', appearance: 'Elongated plum shape, 3–4" long, pointed tip. Thin skin, deeply red when ripe.' },
  sunrisebee:    { img: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Sun_Gold_Tomatoes_%284866974729%29.jpg', yield: '200+ cherry tomatoes per plant from mid-July through frost. 1 plant in your garden.', taste: 'Sweet and fruity with tropical notes. Bi-color adds visual interest. Very popular for snacking straight off the vine.', appearance: 'Small 1" cherry tomatoes, yellow-orange with red blush and subtle stripes.' },
  cherokee:      { img: 'https://upload.wikimedia.org/wikipedia/commons/6/6f/Tomato_%27Cherokee_Purple%27_%28Lycopersicon_lycopersicum%29.jpg', yield: '4–8 large fruits per plant. Peak harvest August–September. 1 plant in your garden.', taste: 'Rich, complex, smoky-sweet flavor with earthy undertones and lower acidity. Best fresh-sliced with salt and olive oil.', appearance: 'Large 10–16oz beefsteak shape. Dusky rose/brick-red skin with greenish-purple shoulders.' },
  sweet100:      { img: 'https://upload.wikimedia.org/wikipedia/commons/1/16/Sun_Gold_Tomatoes_%284866974729%29.jpg', yield: '300+ cherry tomatoes per plant. Very prolific from mid-July through frost. 3 plants in your garden.', taste: 'Classic cherry tomato sweetness — bright, tangy, perfectly balanced. Excellent fresh, roasted, or in pasta.', appearance: 'Small 1" round bright red fruits. Grow in long clusters of 20–30.' },
  pepperoncini:  { img: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Banana_peppers.jpg', yield: '25–50 peppers per plant from July through frost. 2 plants in your garden.', taste: 'Mild, tangy, slightly sweet (100–500 SHU). Classic pickled Italian flavor.', appearance: 'Long 3–5", thin-walled, wrinkled. Harvest yellow-green; turns red if left.' },
  hungarianhot:  { img: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Banana_peppers.jpg', yield: '20–30 peppers per plant from July through frost. 2 plants in your garden.', taste: 'Medium heat (5,000–10,000 SHU). Fruity, complex flavor behind the heat. Outstanding pickled, stuffed, or fresh.', appearance: 'Long 5–8", tapered, waxy. Starts pale yellow, ripens to orange-red.' },
  chocolatebell: { img: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Succulent_Orange_Bell.JPG', yield: '4–6 large peppers per plant from August–September. 1 plant in your garden.', taste: 'Sweet bell pepper — deep, rich sweetness when fully chocolate-brown. Zero heat. Outstanding raw or roasted.', appearance: 'Standard blocky bell shape, 3–4". Must ripen fully to chocolate-brown/mahogany before harvest.' },
  sweetbanana:   { img: 'https://upload.wikimedia.org/wikipedia/commons/4/4f/Banana_peppers.jpg', yield: '25–50 peppers per plant from July through frost. 3 plants in your garden.', taste: 'Mild and sweet (0–500 SHU). Excellent fresh in salads, pickled, or stuffed. Harvest yellow-green for sweetest flavor.', appearance: 'Long 4–6", smooth, tapered. Yellow-green when ready to harvest, turns red if left.' },
  orangeblaze:   { img: 'https://upload.wikimedia.org/wikipedia/commons/f/fe/Succulent_Orange_Bell.JPG', yield: '6–10 peppers per plant from July–August. Matures earlier than most bells. 1 plant in your garden.', taste: 'Very sweet orange bell — crisp, fruity. Must be fully orange for peak sweetness.', appearance: 'Compact blocky bell, 3–4". Ripens to vivid orange. Slightly smaller than standard bells.' },
  candycane:     { img: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Pepper_Parks_%26_Cherry_Bomb.jpg', yield: '20–30 peppers per plant from July through frost. 1 plant in your garden.', taste: 'Sweet and mild with a slight fruity note. The unique striped appearance makes it a conversation piece.', appearance: 'Round cherry size, 1.5–2". Distinctive cream/chocolate-red stripes on a dark background.' },
  hotcherry:     { img: 'https://upload.wikimedia.org/wikipedia/commons/8/8f/Pepper_Parks_%26_Cherry_Bomb.jpg', yield: '20–40 peppers per plant from July through frost. 4 plants in your garden.', taste: 'Hot but manageable (2,500–5,000 SHU). Outstanding pickled — the classic Italian cherry pepper.', appearance: 'Round globe, 1–1.5". Deep green ripening to red.' },
  tastygreen:    { img: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Small_cucumber_-_vegetable.jpg', yield: 'Dozens per plant from June–August. Pick every 2–3 days — leaving fruits on stops production.', taste: 'Mild, crisp, slightly sweet with no bitterness. Very thin skin, minimal seeds.', appearance: 'Compact, straight 6–7" fruits with smooth dark green skin.' },
  springburpless:{ img: 'https://upload.wikimedia.org/wikipedia/commons/a/aa/Cucumber_in_the_greenhouse.jpg', yield: '10–20+ cucumbers per plant from June–August. Very vigorous vine.', taste: 'No digestive discomfort — low cucurbitacin. Sweet, mild flavor. Thin skin needs no peeling.', appearance: 'Long, slender 8–10" fruits. Smooth medium-green skin. Seedless interior.' },
  patiosnacker:  { img: 'https://upload.wikimedia.org/wikipedia/commons/0/0d/Small_cucumber_-_vegetable.jpg', yield: '10–15 cucumbers per plant. 1 plant in your garden. Compact vine.', taste: 'Crisp, mild, sweet — classic snacking cucumber. Thin skin, seedless. Pick at 4–5" for best flavor.', appearance: 'Short 4–5" fruits. Compact plant with shorter internodes.' },
  scarletnantes: { img: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Carottes_nantaises.jpg', yield: '40–60+ carrots per section. Harvest July–August before summer heat peaks.', taste: 'Very sweet, mild, almost no bitter core. Tender and juicy.', appearance: 'Cylindrical, blunt-tipped, 6–7", deep bright orange.' },
  rainbow:       { img: 'https://upload.wikimedia.org/wikipedia/commons/3/32/Carrots_of_many_colors.jpg', yield: '40–60+ mixed-color carrots per section. Harvest July–August.', taste: 'Varies: purple/red are earthier; yellow and white are milder; orange similar to Scarlet Nantes.', appearance: 'Mix of purple, red, yellow, white, and orange — look identical above ground — label clearly.' },
  genericcarrot: { img: 'https://upload.wikimedia.org/wikipedia/commons/0/07/Carottes_nantaises.jpg', yield: '10–20 transplant carrots in your section. Harvest July–August.', taste: 'Standard carrot sweetness and flavor. Transplants may be slightly less uniform than direct-sown.', appearance: 'Standard orange carrot, Nantes or similar shape. Handle roots very gently at transplanting.' },
  burpeebibb:    { img: 'https://upload.wikimedia.org/wikipedia/commons/9/99/Buttercrunch_butterhead_lettuce.jpg', yield: '4–8 heads or continuous outer-leaf harvest from late May–June.', taste: 'Mild, slightly sweet and buttery. Very tender leaves.', appearance: 'Compact loosely-cupped round heads 5–7" across. Medium-green outer leaves, soft pale inner heart.' },
  giantcaesar:   { img: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Romaine_lettuce.jpg', yield: 'Large heads — can reach 12–14" tall. 6–8 full heads through June–July.', taste: 'Crisp, sturdy texture. Classic romaine flavor. Ideal for Caesar salads.', appearance: 'Upright elongated heads 12–14" tall. Dark green outer leaves with thick white ribs.' },
  redromaine:    { img: 'https://upload.wikimedia.org/wikipedia/commons/6/6b/Romaine_lettuce.jpg', yield: '6 transplants — continuous outer-leaf harvest from late May–June.', taste: 'Same crisp romaine texture and flavor as green varieties. Adds stunning color to salads.', appearance: 'Upright romaine with red-tipped or fully red-flushed leaves.' },
  bokchoy:       { img: 'https://upload.wikimedia.org/wikipedia/commons/7/72/Bok_Choy.jpg', yield: '6 plants — harvest 30–45 days from transplant.', taste: 'Mild, slightly sweet and cabbage-like. Crisp white stalks with tender dark leaves.', appearance: 'Upright rosette with thick white stalks and broad dark-green leaves.' },
  arugula:       { img: 'https://upload.wikimedia.org/wikipedia/commons/2/27/Arugula_Leaves.jpg', yield: '6 plants — harvest continuously within 40 days.', taste: 'Peppery, nutty, slightly bitter. Best when young and tender.', appearance: 'Jagged, deeply lobed dark green leaves.' },
  cantaloupe:    { img: 'https://upload.wikimedia.org/wikipedia/commons/4/47/PNG_transparency_demonstration_1.png', yield: '1–3 melons per vine. Ready 70–90 days from sowing.', taste: 'Rich, sweet, aromatic orange flesh. Wait until stem separates easily (slips) with light pressure.', appearance: 'Round to oval, 3–5 lbs, tan/buff with netting. Orange interior.' },
  poblano:       { img: 'https://upload.wikimedia.org/wikipedia/commons/0/09/Poblano_Chili_Pepper.jpg', yield: '5–10 large peppers per plant from August. 4 plants in your garden.', taste: 'Mild to medium heat (1,000–2,000 SHU). Rich, complex, slightly smoky. The classic chile for rellenos.', appearance: 'Large 4–6", heart-shaped, dark forest green.' },
  earlysunglow:  { img: 'https://upload.wikimedia.org/wikipedia/commons/f/f0/Sweet_Corn.JPG', yield: '1–2 ears per stalk; ~28–42 ears total. Ready early July.', taste: 'Very sweet golden-yellow kernels. Exceptional sweetness. Great fresh, grilled, or frozen.', appearance: '7–8" ears with uniform golden-yellow kernels. Stalks reach 5–6ft.' },
  silverqueen:   { img: 'https://upload.wikimedia.org/wikipedia/commons/d/d3/Corn_on_the_cob.jpg', yield: '1–2 ears per stalk; ~42–63 ears total. Ready late July–August.', taste: 'Legendary sweetness — rich, creamy, complex. Tender and milky white kernels.', appearance: '8–9" ears with plump pearlescent white kernels. Stalks reach 6–8ft.' },
  garden:        { img: 'https://upload.wikimedia.org/wikipedia/commons/1/1c/Vegetable_garden.jpg', yield: '~183 growing days. First harvests late May (lettuce/arugula/bok choy), last October (peppers and tomatoes before first frost).', taste: 'Your full mix: rich tomatoes, diverse peppers, crisp cucumbers, two waves of sweet corn, tender lettuces, earthy carrots, cantaloupe, poblano, greens — something new every few weeks.', appearance: '~46ft wide × 22ft deep, south-facing. North: white barn. East: red barn + gate entry. Deer fence on west and south. Drip irrigation from white barn spigot.' },
}

// ─── Gantt data ───────────────────────────────────────────────────────────────

export const GANTT_DATA: GanttRow[] = [
  { group: 'Cool Season', name: 'Bok Choy',                  sub: 'Transplant', sow: 116, grow: 124, harvest: 145, end: 175 },
  { group: 'Cool Season', name: 'Arugula',                   sub: 'Transplant', sow: 116, grow: 124, harvest: 140, end: 175 },
  { group: 'Cool Season', name: 'Burpee Bibb Lettuce',       sub: 'Direct sow', sow: 116, grow: 128, harvest: 150, end: 182 },
  { group: 'Cool Season', name: 'Giant Caesar Romaine',      sub: 'Direct sow', sow: 116, grow: 132, harvest: 160, end: 196 },
  { group: 'Cool Season', name: 'Red Romaine Lettuce',       sub: 'Transplant', sow: 116, grow: 128, harvest: 155, end: 196 },
  { group: 'Cool Season', name: 'Scarlet Nantes Carrots',    sub: 'Direct sow', sow: 116, grow: 140, harvest: 196, end: 227 },
  { group: 'Cool Season', name: 'Rainbow Carrots',           sub: 'Direct sow', sow: 116, grow: 140, harvest: 196, end: 227 },
  { group: 'Warm Season', name: 'Sweet 100 Cherry Tomato',   sub: 'Transplant', sow: 121, grow: 138, harvest: 190, end: 280 },
  { group: 'Warm Season', name: 'Sunrise Bumble Bee Tomato', sub: 'Transplant', sow: 121, grow: 140, harvest: 193, end: 280 },
  { group: 'Warm Season', name: 'Cherokee Purple Tomato',    sub: 'Transplant', sow: 121, grow: 145, harvest: 213, end: 280 },
  { group: 'Warm Season', name: 'Roma Tomato',               sub: 'Transplant', sow: 121, grow: 145, harvest: 213, end: 280 },
  { group: 'Warm Season', name: 'San Marzano Tomato',        sub: 'Transplant', sow: 121, grow: 145, harvest: 213, end: 280 },
  { group: 'Warm Season', name: 'Sweet Banana Pepper',       sub: 'Transplant', sow: 121, grow: 140, harvest: 190, end: 274 },
  { group: 'Warm Season', name: 'Pepperoncini Pepper',       sub: 'Transplant', sow: 121, grow: 140, harvest: 193, end: 274 },
  { group: 'Warm Season', name: 'Hot Cherry Pepper',         sub: 'Transplant', sow: 121, grow: 142, harvest: 196, end: 274 },
  { group: 'Warm Season', name: 'Orange Blaze Bell Pepper',  sub: 'Transplant', sow: 121, grow: 143, harvest: 204, end: 274 },
  { group: 'Warm Season', name: 'Chocolate Bell Pepper',     sub: 'Transplant', sow: 121, grow: 145, harvest: 213, end: 274 },
  { group: 'Warm Season', name: 'Hungarian Hot Wax Pepper',  sub: 'Transplant', sow: 121, grow: 143, harvest: 200, end: 274 },
  { group: 'Warm Season', name: 'Poblano Pepper',            sub: 'Transplant', sow: 121, grow: 145, harvest: 213, end: 274 },
  { group: 'Warm Season', name: 'Tasty Green Cucumber',      sub: 'Direct sow', sow: 121, grow: 135, harvest: 165, end: 230 },
  { group: 'Warm Season', name: 'Spring Burpless Cucumber',  sub: 'Direct sow', sow: 121, grow: 135, harvest: 165, end: 230 },
  { group: 'Warm Season', name: 'Patio Snacker Cucumber',    sub: 'Transplant', sow: 121, grow: 137, harvest: 168, end: 230 },
  { group: 'Warm Season', name: 'Cantaloupe',                sub: 'Direct sow', sow: 135, grow: 155, harvest: 220, end: 250 },
  { group: 'Corn',        name: 'Early Sunglow Corn',        sub: 'Direct sow', sow: 121, grow: 140, harvest: 183, end: 200 },
  { group: 'Corn',        name: 'Silver Queen Corn',         sub: 'Direct sow', sow: 121, grow: 140, harvest: 243, end: 263 },
]

export const GANTT_STAGES: GanttStages = {
  'Bok Choy':                  { sow: 'Transplant settling in; upright dark-green leaves beginning to spread.', grow: 'Compact rosette of broad dark leaves with thick white stalks; ready fast.', harvest: 'Cut whole head at base before summer heat; can harvest outer leaves for cut-and-come-again.' },
  'Arugula':                   { sow: 'Small transplants in rows; distinctive lobed seed leaves.', grow: 'Clusters of deeply notched dark-green leaves; harvest young for mildest flavor.', harvest: 'Harvest outer leaves continuously; bolts quickly in heat — pick before flowering.' },
  'Burpee Bibb Lettuce':       { sow: 'Tiny round seed-leaves just pushing through soil surface.', grow: 'Loose rosette of soft, cupped pale-green leaves forming into a compact buttery head.', harvest: 'Round 5–7" heads with soft butter-yellow center; cut at base before bolting.' },
  'Giant Caesar Romaine':      { sow: 'Seedlings emerging; small elongated seed-leaves close to soil surface.', grow: 'Upright heads forming with dark outer leaves; inner heart beginning to blanch pale yellow.', harvest: 'Full 12–14" elongated heads ready; harvest outer leaves or cut whole head.' },
  'Red Romaine Lettuce':       { sow: 'Transplants settling in; reddish-tipped leaves visible from the start.', grow: 'Upright elongated heads with striking red-flushed outer leaves and pale inner heart forming.', harvest: 'Harvest outer leaves first for continuous supply; cut whole head before bolting.' },
  'Scarlet Nantes Carrots':    { sow: 'Feathery seedlings just breaking through — extremely fine and easy to miss; be patient, takes 10–14 days.', grow: 'Ferny 8–12" green tops established; bright orange roots thickening below ground.', harvest: 'Deep orange carrots visible just below soil surface.' },
  'Rainbow Carrots':           { sow: 'Mixed seeds germinating; seedlings look identical to Scarlet Nantes above ground.', grow: 'Lush ferny tops — colorful variety still hidden underground. Label sections clearly.', harvest: 'Purple, yellow, white, and orange carrots revealed at harvest.' },
  'Sweet 100 Cherry Tomato':   { sow: 'Fresh transplant establishing; 6–10" seedling with first true leaves.', grow: 'Vigorous vines climbing cage; dense dark-green foliage with long clusters of yellow flowers.', harvest: 'Long clusters of 20–30 bright red 1" cherry tomatoes; prolific from mid-July through frost.' },
  'Sunrise Bumble Bee Tomato': { sow: 'Transplant establishing; compact start with broad leaves.', grow: 'Vines climbing cage; clusters of small yellow flowers signal fruit set.', harvest: 'Clusters of bi-color yellow-orange striped 1" cherry tomatoes; sweet and tropical.' },
  'Cherokee Purple Tomato':    { sow: 'Transplant establishing; broad leafy start, needs consistent moisture.', grow: 'Tall vines with large broad leaves; large yellow flowers signal big fruits forming.', harvest: 'Heavy 10–16oz beefsteak fruits with dusky rose skin and greenish-purple shoulders.' },
  'Roma Tomato':               { sow: 'Transplant in warm soil; compact leafy start.', grow: 'Compact semi-determinate vine with dense foliage; clusters of small yellow flowers.', harvest: 'Plum-shaped red fruits in clusters; thick-walled and meaty, perfect for sauce or roasting.' },
  'San Marzano Tomato':        { sow: 'Transplant establishing; elongated leafy start.', grow: 'Indeterminate vine; large leaves; yellow flowers signal long fruits forming.', harvest: 'Elongated plum 3–4" fruits; very dense, few seeds, intensely sweet.' },
  'Sweet Banana Pepper':       { sow: 'Slender transplant settling in; branching starts early.', grow: 'Bushy plant loaded with narrow tapered green fruits and small white flowers.', harvest: 'Long tapered yellow-green fruits; harvest before turning red for sweetest flavor.' },
  'Pepperoncini Pepper':       { sow: 'Small transplant getting established; compact dark-green foliage.', grow: 'Bushy plant with glossy leaves; wrinkled fruits beginning to elongate.', harvest: 'Long 3–5" wrinkled yellow-green fruits; harvest before turning red.' },
  'Hot Cherry Pepper':         { sow: 'Compact transplant settling in.', grow: 'Dense bushy plant with glossy leaves; small round fruits forming in clusters.', harvest: 'Round 1–1.5" fruits from green to deep cherry red; great for pickling.' },
  'Orange Blaze Bell Pepper':  { sow: 'Transplant establishing; compact and upright.', grow: 'Compact plant with blocky green fruits forming; one of the earlier-maturing bells.', harvest: 'Blocky 3–4" fruits turned vivid orange; peak sweetness when fully orange.' },
  'Chocolate Bell Pepper':     { sow: 'Transplant establishing slowly; needs warmth and patience.', grow: 'Upright compact plant; blocky green fruits forming that slowly turn chocolate-brown.', harvest: 'Blocky 3–4" bells turned rich chocolate-brown/mahogany; must fully color for deepest flavor.' },
  'Hungarian Hot Wax Pepper':  { sow: 'Transplant settling in; long tapered leaves.', grow: 'Tall bushy plant; long tapered yellow fruits developing with white flowers.', harvest: 'Long 5–8" tapered fruits, harvest yellow for mild, red for hot.' },
  'Poblano Pepper':            { sow: 'Large-frame transplant establishing; will need bamboo stake soon.', grow: 'Tall bushy plant with large dark-green leaves; large heart-shaped fruits forming.', harvest: 'Large 4–6" heart-shaped dark-green fruits; harvest green for mild smoky flavor.' },
  'Tasty Green Cucumber':      { sow: 'Seeds germinating; first broad true leaves emerging.', grow: 'Vines climbing trellis; broad palmate leaves and bright yellow flowers.', harvest: 'Compact 6–7" dark green fruits along vine; pick every 2–3 days or plant stops producing.' },
  'Spring Burpless Cucumber':  { sow: 'Seeds germinating; strong broad cotyledons pushing up.', grow: 'Vigorous climbing vine; large leaves and hanging yellow flowers.', harvest: 'Long slender 8–10" fruits hanging straight from vine; crisp, thin-skinned, seedless.' },
  'Patio Snacker Cucumber':    { sow: 'Compact transplant establishing on trellis.', grow: 'Shorter vines with compact internodes; small yellow flowers signal fruit set.', harvest: 'Short 4–5" crisp fruits; pick frequently at snacking size for best texture.' },
  'Cantaloupe':                { sow: 'Seeds germinating; broad cotyledons with very fast growth in warm soil.', grow: 'Vigorous sprawling vines; yellow flowers; small green melons forming and sizing up.', harvest: 'Tan/buff netted skin fully developed; stem separates easily with light pressure — ripe!' },
  'Early Sunglow Corn':        { sow: 'Seeds just germinating; first grass-like blades pushing through soil.', grow: 'Stalks 4–5ft tall with broad leaves; tassels appearing and silks emerging. First wave.', harvest: 'Full 7–8" ears with plump golden-yellow kernels; silks brown and dried — harvest early July.' },
  'Silver Queen Corn':         { sow: 'Seeds germinating; identical early grass-like stage — keep columns separate.', grow: 'Taller stalks 6–8ft; broad leaves with tassels; silk development 3–4 weeks behind Early Sunglow.', harvest: '8–9" ears with pearlescent white kernels; silks fully brown — harvest late July–August.' },
}

// ─── System prompt ────────────────────────────────────────────────────────────

export function buildSowSystemPrompt(today: string): string {
  return `You are a knowledgeable, friendly garden assistant for a first-time gardener in Doylestown, Pennsylvania (USDA Zone 6b). Today's date is ${today}. Last frost passed ~April 15. First fall frost ~October 15.

GARDEN LAYOUT — Durham Kitchen Garden (~46ft wide × 22ft deep, south-facing):
North: white barn. East: red barn + gate entry. Deer fence on west and south sides. Drip irrigation mainline from white barn spigot across top of corn section, down east edge of veg rows.

VEGETABLE SIDE (west 18ft wide):
5 rows running east–west (18ft long), separated by 1.5ft walking paths. Row widths from back (north) to front (south):
- Row 1 (back, 3ft wide): Roma (3 transplants) | San Marzano (1 transplant) | Sunrise Bumble Bee (1 transplant) | Cherokee Purple (1 transplant) | Sweet 100 Cherry (3 transplants)
- Row 2 (1.5ft wide): Pepperoncini (2) | Hungarian Hot Wax (2) | Chocolate Bell (1) | Sweet Banana (3) | Orange Blaze Bell (1) | Candy Cane Choc Cherry (1) | Hot Cherry (4)
- Row 3 (middle, 3ft wide): Tasty Green Hybrid Cucumber (direct sow, 4/10 row) | Spring Burpless Cucumber (direct sow, 4/10) | Patio Snacker Cucumber (transplant, 2/10)
- Row 4 (1.5ft wide): Scarlet Nantes Carrot (direct sow, 2/5) | Rainbow Carrot (direct sow, 2/5) | Garden Carrot transplants (1/5)
- Row 5 (front, 3ft wide): Burpee Bibb Lettuce (direct sow, 1/3) | Giant Caesar Romaine (direct sow, 1/3) | Red Romaine Lettuce (6 transplants, 1/3)

5ft center path separating vegetable side from corn side.

CORN/MIXED VEG SIDE (east ~23ft wide, 14ft deep):
- Column 1 (MIXED VEG): Bok Choy (6 transplants, top ¼) | Arugula (6 transplants, 2nd ¼) | Cantaloupe (1 hill, 3rd ¼) | Poblano Pepper (4 transplants, bottom ¼)
- Columns 2–3: Early Sunglow Hybrid Corn (62–65 days, direct sow May 1)
- Columns 4–6: Silver Queen Corn (92 days, direct sow May 1)

INFRASTRUCTURE PREREQUISITES (must complete before planting):
1. DEER FENCE — install first before anything else. 7–8ft netting, T-posts every 8–10ft.
2. TILL & BED PREP — rear-tine motorized tiller to 8–10" depth (12" for carrots), add compost and perlite.
3. ROW MARKING — stakes and string after tilling.
4. WALKING PATH COVERAGE — straw bales for 1.5ft paths and 5ft center path.
5. CUCUMBER TRELLIS (Row 3) — install BEFORE sowing. T-posts + cattle panel, 5–6ft tall.
6. TOMATO CAGES (Row 1) — 9 heavy-duty 60"+ cages, place at transplant time.
7. PEPPER STAKES — bamboo stakes 3–4ft, 18 total, place at transplant time.
8. MULCH ALL BEDS — 2–3" straw after planting.

PURCHASE TASK RULES: Each purchase task must represent exactly one item. Never bundle multiple different supply types. Set purchase:true only for buying or renting. For every direct-sowing task, include a paired purchase task for the seeds. For every transplant task, include a purchase task for the starts. The gardener owns NO seeds, transplants, tools, or supplies of any kind.

LOCAL NURSERIES: Spring Valley Nurseries, Buckman's Home & Garden, Bucks Country Gardens, Bountiful Acres.

When generating weekly tasks, always factor in: today's date, what is overdue, weather forecast, what has been logged or completed. Return JSON for tasks, prose for chat. Be warm, specific, and actionable.`
}

// ─── Status helpers ───────────────────────────────────────────────────────────

export const STATUS_CYCLE: PlotStatus[] = ['planning', 'growing', 'harvest', 'done']
export const STATUS_LABELS: Record<PlotStatus, string> = { planning: 'Planning', growing: 'Growing', harvest: 'Harvesting', done: 'Done' }
export const CONF_LABELS: Record<number, string> = { 1: 'Thriving', 2: 'Good', 3: 'OK', 4: 'Struggling', 5: 'Poor' }

export const MONTHS = ['Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct']
export const MONTH_STARTS = [91, 121, 152, 182, 213, 244, 274]

export function todayDOY(): number {
  const now = new Date()
  const yearStart = new Date(now.getFullYear(), 0, 0)
  return Math.floor((now.getTime() - yearStart.getTime()) / 86400000)
}

export function isPurchaseTask(t: Task): boolean {
  if (t.purchase === true) return true
  return /^(buy|purchase|order|rent|pick up)\b/i.test(t.text.trim())
}
