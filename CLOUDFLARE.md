# Własne konto Cloudflare — SAD2026

Repozytorium: https://github.com/szymonczarnonabialym/SAD2026, gałąź `main`, katalog główny repozytorium.
Ta ścieżka korzysta z osobnej bazy i logowania Cloudflare Access. Dane z lokalnego podglądu ani publikacji Sites nie przenoszą się automatycznie.

1. W **Storage & databases → D1** utwórz bazę `sad2026`. Konfiguracja `wrangler.cloudflare.jsonc` zawiera podany przez właściciela Database ID `9aeb2515-2cac-4500-9583-e0069486b494` i binding `DB`.
2. Otwórz tę bazę → **Console**, wklej i wykonaj zawartość [cloudflare/schema.sql](cloudflare/schema.sql). Polecenie tworzy tabelę `farms`, zachowując istniejące dane.
3. W **Workers & Pages → Create application → Import repository** wybierz `SAD2026`. Ustaw:
   - Project name: `sad2026`
   - Production branch: `main`
   - Root directory: `/` (główny katalog repozytorium)
   - Build command: `npm run build:cloudflare`
   - Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
   - Jeśli panel pyta o komendę wersji podglądowych: `npx wrangler versions upload --config dist/server/wrangler.json`. Automatyczne URL-e wersji podglądowych są wyłączone w konfiguracji.
   - Build variable: `NODE_VERSION` = `24`.
   Kliknij **Deploy**. Binding D1 pochodzi z konfiguracji; nie zmieniaj jego nazwy `DB`. Gdy panel zgłosi brak uprawnień do bazy, wybierz token wdrożenia mający dostęp do tej bazy D1 i edycji Workers.
4. Skopiuj adres produkcyjny `sad2026.<twoja-subdomena>.workers.dev`. Pierwsze otwarcie może pokazać informację o brakujących ustawieniach Access — dane nie są wtedy udostępniane.
5. Otwórz **Zero Trust**. Przy pierwszym wejściu skonfiguruj organizację i zanotuj jej domenę `https://<nazwa>.cloudflareaccess.com`. W **Access → Applications → Add an application → Self-hosted** dodaj aplikację „Mój Sad”, obejmującą pełny hostname produkcyjny z kroku 4. Utwórz politykę **Allow**, **Include → Emails**, wpisując wyłącznie adresy osób, które mają mieć dostęp. Włącz logowanie **One-time PIN**, jeżeli nie jest dostępne domyślnie. Kod przychodzi na podany e-mail.
6. W szczegółach aplikacji Access skopiuj **Application Audience (AUD) Tag**. W **Workers & Pages → sad2026 → Settings → Variables and Secrets** dodaj jako tekstowe zmienne wykonania:

   | Nazwa | Wartość |
   | --- | --- |
   | `CF_ACCESS_TEAM_DOMAIN` | `https://<nazwa>.cloudflareaccess.com` — pełna domena organizacji, bez końcowego ukośnika |
   | `CF_ACCESS_AUD` | Application Audience (AUD) Tag tej aplikacji Access |

   Zapisz / wdroż zmiany. To zmienne Workera, a nie sekcji Build. Konfiguracja `keep_vars` zachowuje je przy następnych publikacjach.
7. Otwórz adres aplikacji, zaloguj się kodem e-mail i sprawdź zapis oraz odczyt własnego wpisu po odświeżeniu. Na telefonie otwórz ten adres w Chrome; z menu wybierz „Dodaj do ekranu głównego” / „Zainstaluj aplikację”.

Serwer weryfikuje podpis tokenu Access, wystawcę, odbiorcę i termin ważności. Sam nagłówek z adresem e-mail nie daje dostępu. Brak ustawień lub nieprawidłowy token blokuje dostęp do aplikacji i API.

Weryfikacja lokalna: `node --experimental-strip-types scripts/check-cloudflare-auth.ts`, TypeScript i kompilacja `npm run build:cloudflare`. Pełne logowanie oraz zapis na koncie właściciela wymagają sprawdzenia po wykonaniu kroków powyżej.

Źródła: [D1](https://developers.cloudflare.com/d1/get-started/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/), [weryfikacja tokenu Access](https://developers.cloudflare.com/cloudflare-one/access-controls/applications/http-apps/authorization-cookie/validating-json/), [One-time PIN](https://developers.cloudflare.com/cloudflare-one/integrations/identity-providers/one-time-pin/).
