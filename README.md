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
| `SUPPLIER_API_URL`, `SUPPLIER_API_KEY`, `SUPPLIER_BRANSCH` | Leverantörens produktfiler (branschen är `konst`) |
| `ALGOLIA_APP_ID`, `ALGOLIA_ADMIN_KEY`, `ALGOLIA_SEARCH_KEY`, `ALGOLIA_INDEX` | Sök |
| `FRANKFURTER_URL` (valfri) | Valutakurser, har ett standardvärde |

Nyckeln som får skriva i Algolia (`ALGOLIA_ADMIN_KEY`) finns bara på servern. Sökningen använder en nyckel som bara får söka.

### Testa integrationerna

1. Databasen behöver kolumnerna `sku`, `ean`, `variants`, `source` och `supplier_updated_at` på `products`, samt ett unikt index på `sku`. SQL finns i `server/migration.sql`.
2. Logga in som admin → **Admin → Import**. Kör **Importera CSV** och sedan **Importera XML**. Andra körningen ska inte skapa något nytt.
3. Tryck **Synka sökindex** första gången, eller om sökindexet har blivit osynkat.
4. Gå till `/search` och sök. Prova ett stavfel och bläddra mellan sidorna.
5. Valutaväljaren i navigeringen hämtar kurser via servern (`/api/currency/rates`).

---

## 2. Reflektion

**1. Vilken integrationsmodell använder varje tjänst, och varför?**
Valutakurserna från Frankfurter hämtas med **REST**. Det är små, öppna data som jag läser på begäran, utan inloggning, så REST är det enklaste. Leverantörens produktkatalog hämtas som **fil** (CSV och XML). Det är en stor mängd data som uppdateras då och då och inte behövs i realtid, och filer är det leverantören erbjuder för bulkdata. Algolia används via en **SDK** (`algoliasearch`), ett bibliotek ovanpå Algolias REST-API som sköter nycklar, timeouts och återförsök. Supabase används också via SDK för databas, inloggning och lagring.

**2. Varför går anropen till externa tjänster via Express och inte direkt från React?**
Allt som ligger i webbläsaren kan läsas av vem som helst, så nycklar får inte ligga där. Algolias admin-nyckel kan skriva i och radera hela sökindexet, och leverantörens API-nyckel ska inte vara offentlig. Via Express kan jag också validera data innan den används, cacha, sätta timeouts och byta tjänst utan att klienten behöver ändras. Klienten pratar bara med mitt eget API, och svaren har shoppens eget format, inte tjänsternas.

**3. Varför är det bättre att integrera tjänsterna än att bygga själv?**
Valuta: för att bygga det själv skulle jag behöva hämta kurser från banker eller börser och hålla dem uppdaterade varje dag. Frankfurter gör det gratis. Sök: bra sökning med stavfelstolerans, rangordning och snabb paginering i ett index är svårt att bygga och drifta, och Algolia ger det direkt. En vanlig databassökning med `LIKE` hittar inte "hodie" när man menar "hoodie". Leverantörskatalogen: produktdatan finns hos leverantören. Att skriva in den för hand tar tid och blir fel, och med import hålls priser och lagersaldo i takt.

**4. Vad händer i shoppen om tjänsterna är nere, och hur har jag hanterat det?**
- *Frankfurter:* kurserna cachas i en timme, och om tjänsten inte svarar används gamla kurser i upp till ett dygn. Finns inga alls visas priserna i slantar, och valutaväljaren stängs av. Shoppen fungerar hela tiden.
- *Algolia:* om sökningen misslyckas visas ett begripligt felmeddelande på söksidan. Om indexet inte går att uppdatera när admin ändrar en produkt sparas produkten ändå i databasen, och admin får en varning om att sökindexet inte är uppdaterat, med en knapp för att synka om.
- *Leverantören:* anropen har timeout och återförsök med växande väntetid, och hanterar 429 (för många anrop) genom att vänta. Går det inte får admin ett vänligt felmeddelande, och inget i databasen ändras. Trasiga produkter i en fil hoppas över och redovisas med orsak i stället för att stoppa hela importen.

**5. Vilka risker för beroendet med sig?**
Algolia: sökningen beror på en extern leverantör med en gratisnivå som har gränser, och villkor och priser kan ändras. Skulle tjänsten bli dyrare eller försvinna slutar sökningen fungera, men produkterna finns kvar i min egen databas, så shoppen går att använda och indexet kan byggas om hos en annan leverantör. Leverantörens filformat kan också ändras, och därför valideras all extern data med Zod innan den sparas. Persondata (GDPR) är mest aktuellt för Supabase, som lagrar namn och adress, och senare för betalning. Produktdata i sök och valutakurser innehåller inga personuppgifter.

---

## Teknisk stack

- **Frontend:** React (Vite), React Router
- **Backend:** Node.js, Express, TypeScript
- **Databas:** Supabase (PostgreSQL), med Row Level Security
- **Autentisering:** Supabase Auth
- **Filhantering:** Supabase Storage (produktbilder)
- **Sök:** Algolia
- **Valuta:** Frankfurter
- **Validering av extern data:** Zod
- **Deploy:** Vercel (frontend), Render (backend)

---

## Integrationer

| Tjänst | Modell | Adapter |
|---|---|---|
| Supabase (databas, inloggning, lagring) | SDK | `server/supabaseClient.ts` |
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

Kurser från Frankfurter hämtas via servern med timeout (5 s), ett återförsök, Zod-validering och en cache (1 timme). Är tjänsten nere används gamla kurser i upp till ett dygn, annars visas priserna i slantar. Ordern registreras alltid i slantar.

---

## Diagram och planering

### ER-diagram — första version
![ER-diagram, första version](docs/ERehandel1.jpg)

### ER-diagram — slutversion
![ER-diagram, slutversion](docs/ERehandel2.jpg)

> Databasmodellen ändrades en del under projektets gång. Tabellerna `cart_items`, `products`, `orders`, `order_items` och `profiles` fanns med redan i utkastet, men slutversionen fick flera tillägg: `product_images` (flera bilder per produkt), `collections` (relaterade produkter och varianter av samma mönster), `gallery_items` (portfoliogalleri), samt `theme`, `collection_id` och `color` på `products` och `phone`/`address` på `profiles`. `order_items` fick också ett fryst `product_name`, så att en ändring av en produkts namn i efterhand inte påverkar hur gamla ordrar visas. För importen och sökningen fick `products` dessutom `sku`, `ean`, `variants`, `source` och `supplier_updated_at`. Dessa ändringar syns inte i ER-diagrammet ovan.

### Sitemap
Se [`docs/SITEMAPehandel.pdf`](docs/SITEMAPehandel.pdf) *(PDF renderas inte inbäddat på GitHub, öppnas som separat fil)*

### Tidsplan
Se [`docs/TIDSPLANehandel.pdf`](docs/TIDSPLANehandel.pdf) *(PDF renderas inte inbäddat på GitHub, öppnas som separat fil)*

---

## Funktioner

- Admin-gränssnitt för att lägga till, redigera och ta bort produkter
- Produkter sparas i databasen (namn, beskrivning, pris, lager, bild, kategori, färg)
- Kunder kan se produktlista och lägga produkter i varukorgen
- Kunder kan lägga en beställning (formulär: leveransadress, ingen kortbetalning)
- Ordern sparas i databasen med tillhörande orderrader
- Admin kan se en lista över alla ordrar: kund, orderrader, totalbelopp
- Varukorgen sparas i databasen (`cart_items`), inte i React-state
- Inloggning krävs för att redigera produkter (adminskydd via Supabase Auth + rollkontroll)
- Admin kan markera orderstatus: **Beställd**, **Behandlas**, **Levererad**, **Återbetald**
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
7. Fyll i leveransadress, klicka **Betala** → bekräfta köpet. Ordern syns under **Mina sidor**

### Testa som administratör

Logga in med adminkontot från inlämningskommentaren.

1. En **Admin**-länk syns nu i navigeringen
2. Under **Admin → Produkter**: lägg till, redigera eller ta bort en produkt, och sortera eller filtrera på kollektion
3. Under **Admin → Ordrar**: se alla lagda ordrar och ändra status på en av dem via dropdown-menyn
4. Under **Admin → Import**: kör **Importera CSV** och **Importera XML**. Rapporten visar 44 produkter och att LEV-1037 hoppades över. En andra import skapar inga nya produkter
5. Ändra eller ta bort en produkt och sök efter den på `/search`. Ändringen syns inom en minut
6. Prova att logga ut och besöka `/admin/products` direkt via URL som utloggad — sidan ska neka åtkomst och skicka vidare till inloggning

---

## Kända begränsningar

- **Betalning:** checkout är för närvarande ett formulär utan faktisk kortbetalning eller tredjepartsintegration.
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