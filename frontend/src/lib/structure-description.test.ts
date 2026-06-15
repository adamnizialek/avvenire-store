import { describe, expect, it } from 'vitest';
import { autoStructureDescription } from './structure-description';

// ---------------------------------------------------------------------------
// Real production descriptions, copied verbatim from the live API. These are
// the ground truth the heuristic must handle: two plain-text products that
// must gain structure, and one already-Markdown product that must pass through
// untouched.
// ---------------------------------------------------------------------------

const SNEAKERS = [
  'Marzysz o dodatkowych centymetrach wzrostu, ale nie chcesz rezygnować z wygody, jaką dają ulubione trampki? Te sneakersy w odcieniu ciepłego beżu to „złoty środek”, który pokochały miłośniczki mody na całym świecie. To buty, które modelują sylwetkę, nie spowalniając Twojego tempa życia.',
  'Dlaczego to inwestycja w Twój styl?',
  'Dyskretne uniesienie: Ukryty wewnątrz buta koturn (7 cm) optycznie wydłuża nogi i wysmukla sylwetkę, pozostając całkowicie niewidocznym dla oka. Ciesz się efektem „wow” bez wysiłku związanego z noszeniem klasycznych szpilek.',
  'System błyskawicznego zapinania: Zapomnij o sznurowadłach. Trzy szerokie, solidne rzepy pozwalają na idealne dopasowanie buta do szerokości stopy w ułamku sekundy. To idealne rozwiązanie, gdy liczy się każda minuta poranka.',
  'Wsparcie i stabilizacja: Wysoka cholewka z miękko wyściełanym kołnierzem stabilizuje kostkę, zapewniając komfort nawet podczas całodniowego biegania po mieście. Mięsisty język chroni przed uciskiem, dając uczucie "otulenia" stopy.',
  'Paleta Nude – uniwersalność bez granic: Połączenie piaskowego beżu z subtelnymi, pudrowymi akcentami sprawia, że buty pasują do wszystkiego – od legginsów i oversize’owych bluz, po jeansowe spódnice i zwiewne sukienki.',
  '',
  'Specyfikacja materiałowa:',
  'Stworzone z myślą o estetyce i trwałości:',
  'Materiał zewnętrzny: Warstwowa konstrukcja z wysokogatunkowego zamszu ekologicznego oraz paneli z oddychającej tkaniny technicznej.',
  'Wnętrze: Miękka, tekstylna wyściółka z systemem odprowadzania wilgoci, aby Twoje stopy czuły się świeżo przez cały dzień.',
  'Podeszwa: Antypoślizgowa guma o wysokiej odporności na ścieranie – pewny krok na każdej nawierzchni.',
  'Wysokość koturnu: 7,5 cm (w tym 2 cm podeszwy zewnętrznej).',
].join('\n');

const BALERINY = [
  'Szukasz butów, które sprawią, że nawet najprostsza stylizacja nabierze charakteru prosto z wybiegów w Paryżu czy Tokio? Nasze baleriny z charakterystycznym rozcięciem (split-toe) to połączenie wielowiekowej tradycji japońskiej z nowoczesnym, minimalistycznym designem.',
  'Dlaczego to Twój nowy „must-have”?',
  'Design, który intryguje: Charakterystyczny, rozdzielony nosek to znak rozpoznawczy koneserów mody. Wybierając ten model, dajesz światu znać, że nie boisz się wychodzić poza utarte szlaki i cenisz sobie unikalność.',
  'Naturalna biomechanika stopy: Choć wyglądają awangardowo, konstrukcja Tabi jest niezwykle wygodna. Rozdzielenie palców sprzyja lepszemu krążeniu i zapewnia większą stabilność, pozwalając Twoim stopom na naturalny ruch przez cały dzień.',
  'Miękkość, którą odczujesz od razu: Wykonane z wyselekcjonowanej, elastycznej skóry, buty błyskawicznie dopasowują się do kształtu Twojej stopy, eliminując ryzyko otarć. To „druga skóra”, w której zapomnisz, że masz coś na nogach.',
  'Subtelna kobiecość: Delikatna kokardka na froncie dodaje butom lekkości i klasycznego wdzięku, tworząc idealny balans między surową formą a subtelnym detalem.',
  '',
  'Dane techniczne i materiały:',
  'Zaprojektowane z myślą o trwałości i estetyce, która przetrwa próbę czasu:',
  'Materiał: najwyższej klasy eko skóra – zapewnia stopie oddychalność i luksusowe wykończenie.',
  'Podeszwa: Elastyczny kompozyt skórzano-gumowy, który amortyzuje kroki i zapewnia przyczepność na miejskich chodnikach.',
  'Kolor: Klasyczna, głęboka czerń z matowym połyskiem.',
].join('\n');

// Already authored with real Markdown (## headings, - bullets, **bold**, *em*).
const KARDIGAN = `Zdefiniuj swój styl na nowo z naszym najnowszym swetrem, który łączy w sobie bezkompromisowy komfort z odwagą i nowoczesnym designem. To nie jest zwykły element garderoby – to *statement piece*, który przyciąga wzrok i nadaje charakteru nawet najprostszej stylizacji.

## Dlaczego pokochasz ten model?

- **Unikalny detal, który robi różnicę** — zamiast klasycznych guzików postawiliśmy na siedem metalowych klamer typu lobster, rozmieszczonych asymetrycznie.
- **Komfort w rozmiarze oversize** — luźny, pudełkowy krój zapewnia pełną swobodę ruchów.

## Szczegóły techniczne i skład

- **Skład:** 60% wełna merino, 30% alpaka, 10% poliamid z recyklingu
- **Kolor:** Charcoal Grey (ciemny grafit)`;

describe('autoStructureDescription — plain prose gains structure (Sneakers)', () => {
  const out = autoStructureDescription(SNEAKERS);

  it('keeps the intro as a paragraph (not a heading/bullet)', () => {
    expect(out).toContain('Marzysz o dodatkowych centymetrach wzrostu');
    expect(out).not.toContain('## Marzysz');
    expect(out).not.toContain('- **Marzysz');
  });

  it('promotes the trailing-"?" line to a heading', () => {
    expect(out).toContain('## Dlaczego to inwestycja w Twój styl?');
  });

  it('promotes a short trailing-":" section label to a heading (colon stripped)', () => {
    expect(out).toContain('## Specyfikacja materiałowa');
    expect(out).not.toContain('## Specyfikacja materiałowa:');
  });

  it('converts "Label: value" lines into bold-label bullets', () => {
    expect(out).toContain('- **Dyskretne uniesienie:** Ukryty wewnątrz buta koturn');
    expect(out).toContain('- **System błyskawicznego zapinania:** Zapomnij o sznurowadłach');
    expect(out).toContain('- **Wsparcie i stabilizacja:** Wysoka cholewka');
    expect(out).toContain('- **Paleta Nude – uniwersalność bez granic:** Połączenie piaskowego');
    expect(out).toContain('- **Materiał zewnętrzny:** Warstwowa konstrukcja');
    expect(out).toContain('- **Wnętrze:** Miękka, tekstylna');
    expect(out).toContain('- **Podeszwa:** Antypoślizgowa guma');
    expect(out).toContain('- **Wysokość koturnu:** 7,5 cm (w tym 2 cm podeszwy zewnętrznej).');
  });

  it('leaves a long trailing-":" lead-in as a plain paragraph (not heading/bullet)', () => {
    expect(out).toContain('Stworzone z myślą o estetyce i trwałości:');
    expect(out).not.toContain('## Stworzone');
    expect(out).not.toContain('- **Stworzone');
  });

  it('groups the four feature bullets into one contiguous list', () => {
    const block = [
      '- **Dyskretne uniesienie:** Ukryty wewnątrz buta koturn (7 cm) optycznie wydłuża nogi i wysmukla sylwetkę, pozostając całkowicie niewidocznym dla oka. Ciesz się efektem „wow” bez wysiłku związanego z noszeniem klasycznych szpilek.',
      '- **System błyskawicznego zapinania:** Zapomnij o sznurowadłach. Trzy szerokie, solidne rzepy pozwalają na idealne dopasowanie buta do szerokości stopy w ułamku sekundy. To idealne rozwiązanie, gdy liczy się każda minuta poranka.',
      '- **Wsparcie i stabilizacja:** Wysoka cholewka z miękko wyściełanym kołnierzem stabilizuje kostkę, zapewniając komfort nawet podczas całodniowego biegania po mieście. Mięsisty język chroni przed uciskiem, dając uczucie "otulenia" stopy.',
      '- **Paleta Nude – uniwersalność bez granic:** Połączenie piaskowego beżu z subtelnymi, pudrowymi akcentami sprawia, że buty pasują do wszystkiego – od legginsów i oversize’owych bluz, po jeansowe spódnice i zwiewne sukienki.',
    ].join('\n');
    expect(out).toContain(block);
  });
});

describe('autoStructureDescription — plain prose gains structure (Baleriny)', () => {
  const out = autoStructureDescription(BALERINY);

  it('promotes both heading lines', () => {
    expect(out).toContain('## Dlaczego to Twój nowy „must-have”?');
    expect(out).toContain('## Dane techniczne i materiały');
    expect(out).not.toContain('## Dane techniczne i materiały:');
  });

  it('converts label lines into bold-label bullets', () => {
    expect(out).toContain('- **Design, który intryguje:** Charakterystyczny');
    expect(out).toContain('- **Naturalna biomechanika stopy:** Choć wyglądają');
    expect(out).toContain('- **Miękkość, którą odczujesz od razu:** Wykonane');
    expect(out).toContain('- **Subtelna kobiecość:** Delikatna kokardka');
    expect(out).toContain('- **Materiał:** najwyższej klasy eko skóra');
    expect(out).toContain('- **Podeszwa:** Elastyczny kompozyt');
    expect(out).toContain('- **Kolor:** Klasyczna, głęboka czerń');
  });

  it('leaves the long lead-in as a plain paragraph', () => {
    expect(out).toContain('Zaprojektowane z myślą o trwałości i estetyce, która przetrwa próbę czasu:');
    expect(out).not.toContain('- **Zaprojektowane');
    expect(out).not.toContain('## Zaprojektowane');
  });
});

describe('autoStructureDescription — already-Markdown passes through untouched', () => {
  it('returns Kardigan byte-for-byte unchanged', () => {
    expect(autoStructureDescription(KARDIGAN)).toBe(KARDIGAN);
  });

  it('does not double-process its own output (idempotent)', () => {
    const once = autoStructureDescription(SNEAKERS);
    expect(autoStructureDescription(once)).toBe(once);
  });
});

describe('autoStructureDescription — adversarial edge cases', () => {
  it('does not turn a mid-sentence "?" paragraph into a heading', () => {
    const input =
      'Czy wiesz, że te buty naprawdę działają? Tak, działają znakomicie i każdego dnia zapewniają komfort oraz świetny wygląd przez wiele godzin.';
    const out = autoStructureDescription(input);
    expect(out).not.toContain('##');
    expect(out).toBe(input);
  });

  it('does not promote a long trailing-"?" line to a heading', () => {
    const input =
      'Czy zastanawiałaś się kiedykolwiek, dlaczego właśnie te konkretne buty stały się absolutnym hitem tego sezonu wśród najbardziej wymagających klientek?';
    const out = autoStructureDescription(input);
    expect(out).not.toContain('##');
  });

  it('does not bold a long sentence that merely contains a colon', () => {
    const input =
      'To jest naprawdę bardzo długie zdanie wprowadzające naszą kolekcję, które przypadkiem zawiera dwukropek: a potem ciąg dalszy myśli autora.';
    const out = autoStructureDescription(input);
    expect(out).not.toContain('- **');
    expect(out).not.toContain('**');
  });

  it('leaves a single structureless paragraph essentially as-is', () => {
    const input = 'To jest zwykły opis produktu bez żadnej struktury ani etykiet.';
    const out = autoStructureDescription(input);
    expect(out).not.toContain('##');
    expect(out).not.toContain('- ');
    expect(out).toBe(input);
  });

  it('handles empty / whitespace-only input without throwing', () => {
    expect(autoStructureDescription('')).toBe('');
    expect(autoStructureDescription('   ').trim()).toBe('');
  });
});
