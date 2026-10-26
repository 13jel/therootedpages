# The Rooted Pages

E-handelsplattform för handtecknade posters, tapeter och tyger.

**Live-sida:** https://the-rooted-pages.vercel.app

---

## Innehåll

1. [Kom igång](#1-kom-igång)
2. [Reflektion](#2-reflektion)
3. [Teknisk stack](#teknisk-stack)
4. [Integrationer](#integrationer)
5. [Diagram och planering](#diagram-och-planering)
6. [Funktioner](#funktioner)
7. [Testguide](#testguide)
8. [Kända begränsningar](#kända-begränsningar)
9. [Projektstruktur](#projektstruktur)

---

## 1. Kom igång

**Deployad shop:** https://the-rooted-pages.vercel.app (frontend på Vercel, backend på Render).

> Backend på Renders gratisnivå kan behöva ca 30–50 sekunder för att vakna efter en tids inaktivitet. Första sidladdningen kan därför vara långsam.

### Starta lokalt

Backend (körs på `http://localhost:3000`):

```bash
cd server
npm install
cp .env.example .env   # fyll i nycklarna, se tabellen nedan
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

Frontend kräver en `client/.env` med `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` och `VITE_API_URL`. Lokalt är `VITE_API_URL` `http://localhost:3000` (http, inte https). Starta om Vite efter ändringar i `.env`.

### Testkonton

Testkonton för kund och admin lämnas i kommentaren vid inlämningen på lärplattformen, inte i repot. Du kan också skapa ett eget kundkonto på `/register`.

### Nycklar

Alla nycklar ligger i `server/.env`. Filen committas aldrig. `server/.env.example` visar vilka variabler som behövs.

| Variabel | Används till |
|---|---|
| `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` | Databas, inloggning och lagring |
| `STORAGE_BUCKET` | Namnet på den publika bucketen för produktbilder |
| `SUPPLIER_API_URL`, `SUPPLIER_API_KEY`, `SUPPLIER_BRANSCH` | Leverantörens produktfiler (branschen är `konst`) |
| `ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_KEY`, `ALGOLIA_SEARCH_KEY`, `ALGOLIA_INDEX` | Sök |
| `STRIPE_SECRET_KEY` | Betalning (testläge). Finns bara på servern |
| `STRIPE_WEBHOOK_SECRET` | Verifierar att webhooken verkligen kommer från Stripe |
| `CLIENT_URL` | Shoppens adress, dit Stripe skickar tillbaka kunden efter betalningen |
| `FRANKFURTER_URL` (valfri) | Valutakurser, har ett standardvärde |

Hemliga nycklar (`ALGOLIA_ADMIN_KEY`, `STRIPE_SECRET_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) finns bara på servern. Sökningen använder en nyckel som bara får söka, och webbläsaren får aldrig någon hemlig nyckel. Stripe-nycklarna är från **testläget**.

### Testa integrationerna

1. Kör SQL-filerna i `server/` i Supabase SQL Editor, i den här ordningen: `migration.sql` (import och sök), `migration-labb3-del1.sql` och därefter `migration-labb3-del2.sql` (betalning, kör del 1 ensam först), och `migration-labb4.sql` (bildlagring).
2. Logga in som admin → **Admin → Import**. Kör **Importera CSV** och sedan **Importera XML**. Andra körningen ska inte skapa något nytt.
3. Tryck **Synka sökindex** första gången, eller om sökindexet har blivit osynkat.
4. Gå till `/search` och sök. Prova ett stavfel och bläddra mellan sidorna.
5. Valutaväljaren i navigeringen hämtar kurser via servern (`/api/currency/rates`).
6. **Betalning:** lägg en vara i varukorgen och betala med testkortet `4242 4242 4242 4242` (valfritt framtida datum och valfri CVC). Se Testguide.
7. **Bilder:** under **Admin → Produkter**, ladda upp en JPEG eller PNG på en produkt.

**Betalning lokalt.** Webhooken från Stripe måste nå din lokala server. Installera Stripe CLI, kör `stripe login` och sedan:

```bash
stripe listen --events checkout.session.completed,checkout.session.expired --forward-to localhost:3000/api/stripe/webhook
```

Kommandot skriver ut en `whsec_...`. Lägg den som `STRIPE_WEBHOOK_SECRET` i `server/.env` och starta om servern. I den deployade shoppen tas webhooken i stället emot via en endpoint som är skapad i Stripe Dashboard (`https://trp-backend-gfzb.onrender.com/api/stripe/webhook`, händelserna `checkout.session.completed` och `checkout.session.expired`), med en egen `whsec_...` som ligger i Renders miljövariabler.

---

## 2. Reflektion

**1. Vilken integrationsmodell använder varje tjänst, och varför?**
Valutakurserna från Frankfurter hämtas med **REST** på begäran. Det är små, öppna data utan inloggning, så REST är det enklaste. Leverantörens produktkatalog hämtas som **fil** (CSV och XML). Det är en stor mängd data som uppdateras då och då och inte behövs i realtid, och filer är det leverantören erbjuder för bulkdata. Algolia och Supabase (databas, inloggning och bildlagring) används via **SDK**, ett bibliotek som sköter nycklar, timeouts och återförsök. Stripe används på två sätt: via SDK för att skapa en betalsession, och via **webhook** för att få veta resultatet. Betalningen sker hos Stripe och kunden lämnar shoppen en stund, så Stripe får höra av sig när något hänt i stället för att jag frågar hela tiden.

**2. Varför går anropen till externa tjänster via Express och inte direkt från React?**
Allt i webbläsaren kan läsas av vem som helst, så hemliga nycklar (Algolias admin-nyckel, Stripes hemliga nyckel, Supabases service role, leverantörens nyckel) får inte ligga där. Ett andra skäl är att klienten inte går att lita på. Priset på en order räknas därför på servern från databasen, och React skickar bara vilka produkter och hur många. Bildfiler valideras på servern (på innehållet, inte på filnamnet) innan de går till molnlagringen. Via Express kan jag också validera extern data, sätta timeouts och byta tjänst utan att klienten behöver ändras.

**3. Varför är det bättre att integrera tjänsterna än att bygga själv?**
Valuta: jag skulle behöva hämta och uppdatera kurser varje dag, och Frankfurter gör det gratis. Sök: stavfelstolerans, rangordning och snabb paginering är svårt att bygga, och en databassökning med `LIKE` hittar inte "hodie" när man menar "hoodie". Leverantörskatalogen: datan finns redan hos leverantören, och import håller priser och lagersaldo i takt. Betalning: att hantera kortuppgifter själv kräver PCI-certifiering och är en stor säkerhetsrisk. Med Stripe Checkout rör kortnumret aldrig min server. Bilder: Supabase Storage ger publika, cachebara adresser utan att jag driftar en filserver.

**4. Vad händer i shoppen om tjänsterna är nere, och hur har jag hanterat det?**
- *Frankfurter:* kurserna cachas i en timme, och om tjänsten inte svarar används gamla kurser i upp till ett dygn. Finns inga alls visas priserna i kronor, och valutaväljaren stängs av.
- *Algolia:* om sökningen misslyckas visas ett begripligt felmeddelande på söksidan. Om indexet inte går att uppdatera när admin ändrar en produkt sparas produkten ändå i databasen, och admin får en varning med en knapp för att synka om.
- *Leverantören:* anropen har timeout, återförsök med växande väntetid och hantering av 429. Går det inte får admin ett vänligt felmeddelande och inget i databasen ändras. Trasiga produkter hoppas över och redovisas med orsak.
- *Stripe:* svarar Stripe inte när kunden ska betala får kunden ett begripligt meddelande, och ordern förblir obetald. Är min server nere när betalningen sker försöker Stripe skicka webhooken igen. Eftersom en order bara kan bli betald en gång, och lagret minskas i samma databastransaktion, går det bra att samma händelse kommer flera gånger. En betalning som aldrig görs löper ut, och ordern blir avbruten.
- *Supabase Storage:* svarar lagringen inte får admin ett begripligt meddelande och produkten behåller sin gamla bild. Den nya bilden sparas på produkten först när uppladdningen lyckats, och den gamla filen tas bort efteråt.

**5. Vilka risker för beroendet med sig?**
Algolia: sökningen beror på en extern leverantör med en gratisnivå som har gränser. Försvinner tjänsten slutar sökningen fungera, men produkterna finns kvar i min databas och indexet kan byggas om hos någon annan. Stripe: jag är beroende av en betalleverantör med avgifter per köp, och spärras kontot eller ändras villkoren kan ingen betala. Ordrar och produkter ligger däremot kvar i min databas, och Stripe ligger bakom en adapter som går att byta. Webhooken vore en säkerhetsrisk utan signaturkontroll, eftersom vem som helst då kunde markera en order som betald, så signaturen verifieras alltid. Leverantörens filformat kan ändras, och därför valideras all extern data med Zod. Persondata (GDPR): namn, adress och e-post lagras hos Supabase, e-postadressen skickas också till Stripe, medan kortuppgifter aldrig lagras hos mig. Bildernas adresser pekar på Supabase, så vid byte av leverantör måste de skrivas om i databasen.

---

## Teknisk stack

- **Frontend:** React (Vite), React Router
- **Backend:** Node.js, Express, TypeScript
- **Databas:** Supabase (PostgreSQL), med Row Level Security
- **Autentisering:** Supabase Auth
- **Filhantering:** Supabase Storage (produktbilder, uppladdning via backend)
- **Sök:** Algolia
- **Valuta:** Frankfurter
- **Betalning:** Stripe Checkout (testläge) med signerad webhook
- **Validering av extern data:** Zod
- **Deploy:** Vercel (frontend), Render (backend)

---

## Integrationer

| Tjänst | Modell | Adapter |
|---|---|---|
| Supabase (databas, inloggning) | SDK | `server/supabaseClient.ts` |
| Supabase Storage (produktbilder) | SDK | `server/integrations/storageAdapter.ts` |
| Stripe (betalning) | SDK (REST) och webhook | `server/integrations/paymentAdapter.ts` |
| Frankfurter (valutakurser) | REST | `server/integrations/currencyAdapter.ts` |
| Leverantörens produktkatalog | Fil (CSV och XML) | `server/integrations/supplierAdapter.ts` |
| Algolia (sök) | SDK (klient över REST) | `server/integrations/searchAdapter.ts` |

Alla anrop till externa tjänster går via Express. Varje tjänst har en egen adapter, timeout och felhantering, och extern data valideras med Zod innan den används. En generell felhanterare (`server/middleware/errorHandler.ts`) ger alltid ett JSON-svar med ett begripligt meddelande.

### Import av produktdata

Under **Admin → Import** finns en knapp per format. Importen hämtar leverantörens katalog för branschen `konst`, som CSV (Windows-1252, `;` som avgränsare, decimalkomma) eller XML (UTF-8). Varje produkt valideras. Trasiga produkter hoppas över och visas i rapporten med orsak, till exempel LEV-1037. Produkterna sparas med **upsert på artikelnummer**, så att en andra import inte skapar några dubbletter. Rapporten visar nya, uppdaterade, oförändrade och överhoppade produkter.

Mappningen mellan leverantörens fält och shoppens modell:

| Leverantör | Shoppen | Motivering |
|---|---|---|
| `artNr` | `sku` | Stabil identitet och nyckel för upsert |
| `ean` | `ean` (text) | Text, så att inledande nollor behålls |
| `benamning` | `name` | |
| `kategori` | `category` | |
| `pris` (kr) | `price` (heltal) | Shoppen räknar i heltal |
| `lagersaldo` | `stock` | Tomt värde blir 0, eftersom okänt saldo inte ska kunna säljas |
| `varianter` | `variants` (lista) | `\|`-separerade i CSV, `<variant>`-element i XML |
| `uppdaterad` | `supplier_updated_at` | Visar när leverantören senast ändrade produkten |

Fält som leverantören inte styr (bild, färg, kollektion, beskrivning) skrivs aldrig över vid import.

### Sök

`GET /api/search?q=&page=&pageSize=&category=&inStock=&sort=` söker via Algolia och svarar i shoppens eget format:

```json
{ "data": [ ... ], "meta": { "page": 1, "pageSize": 12, "total": 44, "totalPages": 4 } }
```

Parametrarna valideras med Zod. Ogiltiga värden (till exempel `page=0` eller `pageSize=1000`) ger 400 med ett begripligt fel, och `pageSize` har ett maxtak på 50. Artikelnumret är `objectID` i indexet, så att en uppdaterad produkt ersätter den gamla i stället för att dupliceras (egna produkter utan artikelnummer får `P-<id>`).

Sökindexet hålls i takt med databasen när en produkt skapas, ändras eller tas bort, och efter import. Produkten sparas alltid i databasen först. Misslyckas sökuppdateringen får admin en varning, och **Synka sökindex** under Admin → Import skickar alla aktiva produkter på nytt.

### Valuta

Kurser från Frankfurter hämtas via servern med timeout (5 s), ett återförsök, Zod-validering och en cache (1 timme). Är tjänsten nere används gamla kurser i upp till ett dygn, annars visas priserna i kronor. Priserna i databasen är i svenska kronor (SEK), och kunden betalar alltid i SEK. Övriga valutor är en uppskattning i visningen.

### Betalning (Stripe)

Kunden betalar med **Stripe Checkout** (Stripes egen betalsida, testläge). Flödet:

1. React skickar bara `[{ productId, quantity }]` och leveransadressen till `POST /api/orders/checkout`. Servern hämtar pris och lager från databasen, validerar varukorgen med Zod och räknar totalen i öre. Priset i webbläsaren används aldrig.
2. Servern kontrollerar lagersaldot (en produkt med för lågt saldo kan inte köpas) och sparar ordern med status **Obetald** *innan* kunden skickas till Stripe. Orderns id följer med betalningen som `client_reference_id`.
3. Kunden betalar hos Stripe och skickas tillbaka till `/order/confirmation`, som bara **visar** orderns status. Sidan frågar servern några gånger tills webhooken har kommit fram. Ingenting i React ändrar orderns status.
4. Stripe anropar `POST /api/stripe/webhook`. Servern verifierar signaturen mot den råa bodyn. Ogiltig eller saknad signatur ger 400 och ändrar ingen order.
5. `checkout.session.completed` markerar ordern som betald (**Beställd**) och minskar lagret för varje produkt, i en och samma databastransaktion (SQL-funktionen `mark_order_paid`). Funktionen ändrar bara ordrar som fortfarande är Obetald, så att samma händelse kan komma flera gånger utan att ordern markeras två gånger eller lagret minskas två gånger. Beloppet från Stripe måste dessutom stämma med ordern i databasen. Varukorgen töms först efter betalningen.
6. `checkout.session.expired` (kunden betalade aldrig) markerar en obetald order som **Avbruten**. En order som redan är betald ändras aldrig.
7. Svarar Stripe inte när betalningen ska startas får kunden ett begripligt meddelande, och ordern förblir obetald.

Orderstatusar: **Obetald**, **Avbruten**, **Beställd** (betald), **Behandlas**, **Levererad**, **Återbetald**. Obetald och Avbruten sätts bara av servern. Admin kan bara flytta en betald order vidare.

### Bildlagring (Supabase Storage)

Admin laddar upp en omslagsbild per produkt på adminsidan. Filen skickas till servern (`POST /api/products/:id/image`), som laddar upp den till en publik bucket i Supabase Storage. Webbläsaren anropar aldrig lagringen och hemliga nycklar finns bara på servern.

- Servern validerar filens innehåll: bara JPEG eller PNG, max 5 MB. Annat ger 400 med ett begripligt fel.
- Varje bild sparas på en ny, unik sökväg (`products/<produkt-id>/<slumpat>.jpg`). Adminens filnamn används aldrig, och en befintlig fil skrivs aldrig över.
- Sökväg (`image_path`) och adress (`image_url`) sparas på produkten, och shoppen visar bilden från lagringens adress.
- Vid byte laddas den nya bilden upp och sparas först, och den gamla filen tas bort efteråt. En misslyckad uppladdning, eller en lagring som inte svarar, lämnar produkten med sin gamla bild och ger admin ett begripligt meddelande.

---

## Diagram och planering

### ER-diagram — första version
![ER-diagram, första version](docs/ERehandel1.jpg)

### ER-diagram — slutversion
![ER-diagram, slutversion](docs/ERehandel2.jpg)

> Databasmodellen ändrades en del under projektets gång. Tabellerna `cart_items`, `products`, `orders`, `order_items` och `profiles` fanns med redan i utkastet, men slutversionen fick flera tillägg: `product_images` (flera bilder per produkt), `collections` (relaterade produkter och varianter av samma mönster), `gallery_items` (portfoliogalleri), samt `theme`, `collection_id` och `color` på `products` och `phone`/`address` på `profiles`. `order_items` fick också ett fryst `product_name`, så att en ändring av en produkts namn i efterhand inte påverkar hur gamla ordrar visas. För importen och sökningen fick `products` dessutom `sku`, `ean`, `variants`, `source` och `supplier_updated_at`, för bildlagringen `image_path`, och för betalningen fick `orders` kolumnerna `stripe_session_id` och `paid_at` samt orderstatusarna `Obetald` och `Avbruten`. Dessa ändringar syns inte i ER-diagrammet ovan.

### Sitemap
Se [`docs/SITEMAPehandel.pdf`](docs/SITEMAPehandel.pdf) *(PDF renderas inte inbäddat på GitHub, öppnas som separat fil)*

### Tidsplan
Se [`docs/TIDSPLANehandel.pdf`](docs/TIDSPLANehandel.pdf) *(PDF renderas inte inbäddat på GitHub, öppnas som separat fil)*

---

## Funktioner

- Admin-gränssnitt för att lägga till, redigera och ta bort produkter
- Produkter sparas i databasen (namn, beskrivning, pris i SEK, lager, bild, kategori, färg)
- Admin laddar upp produktbilder (JPEG/PNG, max 5 MB) via servern till molnlagring
- Kunder kan se produktlista och lägga produkter i varukorgen
- Kunder betalar med kort via Stripe Checkout (testläge). Priset räknas på servern och betalningen bekräftas av en signerad webhook
- Ordern sparas i databasen som obetald före betalningen, markeras som betald av webhooken, och lagret minskas en gång per order
- Bekräftelsesida (`/order/confirmation`) som visar ordern och dess status
- Admin kan se en lista över alla ordrar: kund, orderrader, totalbelopp
- Varukorgen sparas i databasen (`cart_items`), inte i React-state
- Inloggning krävs för att redigera produkter (adminskydd via Supabase Auth + rollkontroll)
- Orderstatusar: **Obetald**, **Avbruten**, **Beställd** (betald), **Behandlas**, **Levererad**, **Återbetald**. Admin kan flytta en betald order vidare
- Import av produkter från leverantörens CSV- och XML-filer
- Sök (`/search`) med stavfelstolerans, paginering, filter och sortering via Algolia
- Valutaväljare med kurser från Frankfurter
- Sortering och filtrering på produktsidan (typ/tema) och i admin (sortering, kollektion)
- Produkter med samma mönster i olika färger och typer (poster, tyg, tapet) grupperas till en produkt med väljare
- Flera bilder per produkt med lightbox-visning
- Kollektioner — relaterade produkter länkas till varandra
- Kundkonto ("Mina sidor") med sparad profil och orderhistorik
- Bildgalleri för portfolio-exempel
- Tillgänglighet (ARIA/WCAG): fokushantering, skip-länkar, tangentbordsanvändning och meddelanden för skärmläsare
- Mobilanpassad design

---

## Testguide

### Testa som kund (ingen inloggning krävs för att bläddra)

1. Gå till [the-rooted-pages.vercel.app](https://the-rooted-pages.vercel.app)
2. Bläddra bland produkter på `/products`, testa filter/sök/sortering
3. Klicka på en produkt för detaljvy och välj typ och färg
4. Testa sökningen på `/search`: skriv med ett stavfel och bläddra mellan sidorna
5. Klicka **Logga in** → **Skapa konto** (`/register`) för att registrera ett testkonto, eller använd testkontot från inlämningskommentaren
6. Lägg en produkt i varukorgen, gå till `/cart`
7. Fyll i leveransadress, klicka **Betala** och sedan **Bekräfta och betala**. Du skickas till Stripe.
8. Betala med testkortet `4242 4242 4242 4242`, valfritt framtida utgångsdatum och valfri CVC.
9. Du kommer tillbaka till bekräftelsesidan, som visar ordern. Statusen är först "Obetald" och blir "Beställd" när webhooken har kommit fram (några sekunder). Ordern syns under **Mina sidor**, lagret har minskat och varukorgen är tom.
10. Avbryt en betalning hos Stripe (pilen tillbaka): ordern förblir **Obetald** och varorna ligger kvar i varukorgen. Sessionen löper ut efter 30 minuter, och då markeras ordern som **Avbruten**.

### Testa som administratör

Logga in med adminkontot från inlämningskommentaren.

1. En **Admin**-länk syns nu i navigeringen
2. Under **Admin → Produkter**: lägg till, redigera eller ta bort en produkt, och sortera eller filtrera på kollektion
3. Under **Admin → Ordrar**: se alla ordrar. Obetalda och avbrutna visas som text, och en betald order kan flyttas vidare via dropdown-menyn
4. Under **Admin → Import**: kör **Importera CSV** och **Importera XML**. Rapporten visar 44 produkter och att LEV-1037 hoppades över. En andra import skapar inga nya produkter
5. Ändra eller ta bort en produkt och sök efter den på `/search`. Ändringen syns inom en minut
6. Under **Admin → Produkter**: ladda upp en bild på en produkt. Den visas i shoppen och adressen pekar på Supabase Storage. En PDF eller en bild över 5 MB avvisas med ett tydligt fel. Byt bilden: den nya visas.
7. Prova att logga ut och besöka `/admin/products` direkt via URL som utloggad — sidan ska neka åtkomst och skicka vidare till inloggning

---

## Kända begränsningar

- **Betalning:** Stripe körs i testläge, så inga riktiga pengar dras. Lagret reserveras inte när ordern skapas, utan kontrolleras då och minskas när betalningen bekräftas. Köper två kunder den sista varan samtidigt kan båda betala, och lagret stannar då på 0. Statusen **Återbetald** sätts för hand och gör ingen återbetalning i Stripe. Ingen faktura skickas med e-post.
- **Bilder:** extrabilderna per produkt (galleriet) laddas fortfarande upp direkt från admin-webbläsaren till lagringen, medan omslagsbilden går via servern. Bilder som laddades upp före Labb 4 har ingen `image_path` och tas inte bort av servern när de byts ut.
- **Render (gratisnivå):** backend-tjänsten kan behöva ~30–50 sekunder för att "vakna" efter en tids inaktivitet, vilket gör första sidladdningen efter ett uppehåll långsammare än normalt.
- **Algolia (gratisnivå):** sökningen beror på en extern tjänst. Är den nere visas ett felmeddelande på söksidan, och admin varnas när ett ändrat produktindex inte kunde uppdateras.
- **Leverantörens data:** en produkt (LEV-1037) har ogiltiga uppgifter och hoppas över vid import. Det är avsiktligt och visas i rapporten.

---

## Projektstruktur

```
/client                        React-frontend (Vite)
/server                        Express-backend (TypeScript)
  /routes                      Rutter (produkter, import, sök, valuta m.fl.)
  /integrations                En adapter per extern tjänst
  /middleware                  Autentisering och generell felhanterare
/docs                          ER-diagram, sitemap, tidsplan
```