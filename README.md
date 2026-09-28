# AA Lashstudio – online afspraken

Klanten kiezen een lashlift en een vrije tijd. De afspraak wordt opgeslagen en komt direct in de iCloud-agenda van de studio. Tijden die in iCloud al bezet zijn, kunnen klanten niet kiezen.

- `index.html`: de boekingspagina voor klanten
- `studio.html`: de studio-agenda (met inloggen), met afspraken, annuleren, openingstijden, prijzen en vakantiedagen

## Hoe het werkt

```
Klant (browser)  ──►  GitHub Pages (de website)
       │
       ▼
Supabase (gratis): database + serverfuncties  ◄──►  iCloud Agenda (CalDAV)
```

GitHub Pages kan alleen losse bestanden tonen. Daarom draait het opslaan en het praten met iCloud op Supabase, dat in het gratis pakket ruim genoeg is voor een studio. Je Apple-wachtwoord staat alleen daar en nooit op de website.

Zolang `assets/config.js` leeg is, draait de site in **demomodus** met voorbeeldgegevens. Zo kun je hem al online zetten en bekijken.

---

## Stap 1 – Website op GitHub zetten (10 min)

1. Maak een account op [github.com](https://github.com) als je dat nog niet hebt.
2. Klik rechtsboven op **+ → New repository**. Geef hem een naam, bijvoorbeeld `aalashstudio`, kies **Public** en klik op **Create repository**.
3. Klik op **uploading an existing file** en sleep **alle bestanden en mappen** uit deze map erin.
   - Op een Mac zijn `.github` en `.nojekyll` verborgen. Druk in Finder op **Cmd + Shift + .** om ze te tonen en sleep ze mee.
4. Klik op **Commit changes**.
5. Ga naar **Settings → Pages**. Kies bij *Source* **Deploy from a branch**, branch **main** en map **/ (root)**, en klik op **Save**.
6. Na een minuut staat de site op `https://<jouw-gebruikersnaam>.github.io/aalashstudio/`.

Je ziet nu de demoversie.

## Stap 2 – Supabase instellen (15 min)

1. Maak een gratis account op [supabase.com](https://supabase.com) en klik op **New project**. Kies als regio **Central EU (Frankfurt)** en bewaar het databasewachtwoord.
2. Open **SQL Editor**, plak de hele inhoud van `supabase/setup.sql` erin en klik op **Run**.
3. Maak je eigen inlog voor de studio-agenda:
   - Ga naar **Authentication → Users → Add user → Create new user**, vul je e-mailadres en een sterk wachtwoord in en vink **Auto Confirm User** aan.
   - Ga terug naar de **SQL Editor** en voer dit uit, met jouw e-mailadres:
     ```sql
     insert into public.admins (user_id)
     select id from auth.users where email = 'jouw@email.nl';
     ```
4. Zet nieuwe aanmeldingen uit: **Authentication → Sign In / Providers**, en zet **Allow new users to sign up** uit.

## Stap 3 – iCloud koppelen (5 min)

1. Maak in de Agenda-app op je iPhone of Mac een aparte agenda, bijvoorbeeld **AA Lashstudio**. Hier komen de online afspraken in.
2. Ga naar [account.apple.com](https://account.apple.com), log in en kies **Inloggen en beveiliging → App-specifieke wachtwoorden**. Maak er een aan met de naam "Lashstudio website" en kopieer het wachtwoord (`abcd-efgh-ijkl-mnop`). Hiervoor moet twee-factor-authenticatie aan staan op je Apple ID.
3. Ga in Supabase naar **Edge Functions → Secrets** en voeg toe:

| Naam | Waarde |
|---|---|
| `ICLOUD_USERNAME` | je Apple ID (e-mailadres) |
| `ICLOUD_APP_PASSWORD` | het app-specifieke wachtwoord |
| `ICLOUD_CALENDAR` | de naam van de agenda uit stap 1, bijv. `AA Lashstudio` |
| `ICLOUD_BUSY_CALENDARS` | *(optioneel)* extra agenda's die ook als bezet tellen, bijv. `Thuis,Werk`. Gebruik `*` voor alle agenda's. |
| `FEED_TOKEN` | *(optioneel)* een lang willekeurig woord, voor het agenda-abonnement hieronder |

De website kijkt standaard alleen naar de agenda uit stap 1. Zet je privé-afspraken in een andere agenda en wil je dat die ook blokkeren? Vul die dan in bij `ICLOUD_BUSY_CALENDARS`.

## Stap 4 – Serverfuncties uitrollen (5 min)

Dit gaat automatisch via GitHub:

1. Maak in Supabase een toegangstoken aan: [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) → **Generate new token**.
2. Ga in je GitHub-repository naar **Settings → Secrets and variables → Actions → New repository secret** en voeg toe:
   - `SUPABASE_ACCESS_TOKEN`: het token van stap 1
   - `SUPABASE_PROJECT_ID`: de code uit je Supabase-adres (`https://`**`abcdefghijkl`**`.supabase.co`)
3. Ga naar het tabblad **Actions**, kies **Serverfuncties uitrollen** en klik op **Run workflow**. Na ongeveer een minuut staat er een groen vinkje.

## Stap 5 – Website aan Supabase koppelen (2 min)

1. Ga in Supabase naar **Project Settings → API** (of **Data API**/**API Keys**). Kopieer de **Project URL** en de **anon public**- of **publishable**-sleutel.
2. Open op GitHub het bestand `assets/config.js`, klik op het potlood en vul beide in:
   ```js
   SUPABASE_URL: "https://abcdefghijkl.supabase.co",
   SUPABASE_KEY: "eyJhbGciOi…",
   ```
3. Klik op **Commit changes**. Na een minuut is de site live.

## Stap 6 – Testen

1. Open `…/studio.html` en log in. Bij **iCloud-agenda** moet "Verbonden met iCloud" staan.
2. Maak op de boekingspagina een testafspraak. Die verschijnt binnen enkele seconden in je iCloud-agenda en in de studio-agenda.
3. Annuleer de testafspraak in de studio-agenda. Hij verdwijnt ook uit iCloud.

---

## Goed om te weten

- **Dubbel boeken kan niet.** De database weigert twee afspraken die overlappen, ook als twee klanten op exact hetzelfde moment boeken.
- **Bezet in iCloud = niet boekbaar.** Zet je iets in de gekoppelde agenda (bijvoorbeeld "Pauze" of een hele dag vrij), dan verdwijnen die tijden direct van de website.
- **Openingstijden en prijzen** pas je aan in de studio-agenda onder *Instellingen*. Vakantiedagen voeg je daar ook toe.
- **Behandelduur:** lashlift zonder tint 45 minuten, met tint 60 minuten. Klopt dat niet, pas het dan aan in de studio-agenda.
- **Klanten boeken tot 2 uur van tevoren** en zien de komende 10 open dagen. Het eerste pas je aan in de instellingen; het aantal dagen (`showDays`) in de SQL Editor.
- **Als iCloud even niet bereikbaar is,** wordt de afspraak wel opgeslagen. In de studio-agenda staat er dan een waarschuwing bij, met de knop **Opnieuw naar iCloud sturen**.
- **Reserve: agenda-abonnement.** Heb je `FEED_TOKEN` ingesteld, dan kun je in de Agenda-app op je Mac via **Archief → Nieuw agenda-abonnement** deze link toevoegen:
  `https://<project>.supabase.co/functions/v1/calendar-feed?token=<FEED_TOKEN>`
  Dat is alleen-lezen en ververst om de paar minuten.
- **Eigen domein** (bijv. `aalashstudio.nl`): voeg het toe onder **Settings → Pages → Custom domain** en volg de uitleg van GitHub voor de DNS-instellingen bij je domeinaanbieder.
- **Bevestigingsmail naar klanten** zit er nog niet in. Dat kan later worden toegevoegd, bijvoorbeeld met Resend of Brevo.
- **Privacy:** je slaat namen, e-mailadressen en telefoonnummers op. Vermeld op je site dat je die alleen gebruikt voor de afspraak (AVG).

## Bestanden

```
index.html                 boekingspagina
studio.html                studio-agenda
assets/config.js           Supabase-gegevens (stap 5)
assets/*.js, style.css     de website
supabase/setup.sql         database (stap 2)
supabase/functions/        serverfuncties: vrije tijden, boeken, studio-acties, agenda-abonnement
.github/workflows/         automatisch uitrollen van de serverfuncties (stap 4)
```
