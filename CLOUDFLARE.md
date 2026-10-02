# Własne konto Cloudflare — SAD2026

Repozytorium: https://github.com/szymonczarnonabialym/SAD2026, gałąź `main`, katalog główny repozytorium.
Ten wariant korzysta z bazy D1 właściciela i własnego logowania e-mail/hasło. Dane z lokalnego podglądu ani publikacji Sites nie przenoszą się automatycznie.

## Aktualizacja istniejącego Workera

1. W **Workers & Pages → sad2026 → Settings → Variables and Secrets → Add** wybierz typ **Secret**. Nazwa: `SAD_LOGIN_CONFIG`. Wartość: cała zawartość lokalnego pliku `.sites-runtime/sad-login-secret.json`, przygotowanego dla właściciela. Kliknij **Deploy**. To ustawienie wykonania Workera, nie zmienna sekcji Build. Plik zawiera adres konta i posolony skrót hasła; nie wysyłaj go do GitHub.
2. W ustawieniach Build użyj `npm run build:cloudflare` oraz komendy wdrożenia `npx wrangler deploy --config dist/server/wrangler.json`. Wdróż aktualną gałąź `main` i poczekaj na udane zakończenie.
3. Otwórz adres aplikacji w nowym oknie prywatnym. Przy skonfigurowanym sekrecie pojawi się formularz „Zaloguj się do sadu”. Jeżeli zamiast niego nadal pojawia się ekran Access, wyłącz ochronę **wyłącznie tej aplikacji**: regułę w zakładce **Access** Workera lub aplikację chroniącą jego hostname w **Zero Trust → Access → Applications**. Nie zmieniaj reguł innych aplikacji. Dopiero po wdrożeniu nowego logowania wyłącz poprzednią ochronę. Szczegóły: [wyłączanie Access](https://developers.cloudflare.com/workers/configuration/cloudflare-access/#disable-access).
4. Zaloguj się ustalonym e-mailem i hasłem. Zaznacz **Zapamiętaj to urządzenie**, aby sesja trwała 30 dni. Sprawdź istniejące wpisy i zapis po odświeżeniu. Na telefonie w menu Chrome wybierz „Dodaj do ekranu głównego” / „Zainstaluj aplikację”.

Zmienne `CF_ACCESS_TEAM_DOMAIN` i `CF_ACCESS_AUD` nie są już używane. Nowe logowanie zachowuje identyfikator danych `cloudflare:<e-mail>`, więc wpisy poprzedniego konta Access z tym samym adresem pozostają dostępne. Tabele sesji są tworzone automatycznie bez zmiany rejestru gospodarstwa.

## Pierwsze wdrożenie

1. W **Storage & databases → D1** użyj bazy `sad2026`. Konfiguracja `wrangler.cloudflare.jsonc` zawiera podany przez właściciela Database ID `9aeb2515-2cac-4500-9583-e0069486b494` oraz binding `DB`.
2. W bazie → **Console** wykonaj [cloudflare/schema.sql](cloudflare/schema.sql). Tworzy wymagane tabele bez kasowania istniejących danych.
3. W **Workers & Pages → Create application → Import repository** wybierz `SAD2026`. Ustaw:
   - Project name: `sad2026`
   - Production branch: `main`
   - Root directory: `/`
   - Build command: `npm run build:cloudflare`
   - Deploy command: `npx wrangler deploy --config dist/server/wrangler.json`
   - Komenda wersji podglądowych, jeśli wymagana: `npx wrangler versions upload --config dist/server/wrangler.json`. Automatyczne URL-e wersji podglądowych są wyłączone.
   - Build variable: `NODE_VERSION` = `24`.
4. Kliknij **Deploy**, zachowując binding D1 `DB`. Dodaj sekret i sprawdź logowanie według punktów powyżej. Bez prawidłowego sekretu aplikacja blokuje stronę i API.

## Sesje i konfiguracja lokalna

Hasło jest weryfikowane przez scrypt z losową solą. Sekret `SAD_LOGIN_CONFIG` ma format JSON `{ "email": "adres konta", "passwordHash": "skrót wygenerowany przez skrypt" }`. Sesje używają losowych tokenów; w D1 przechowywane są wyłącznie ich skróty. Cookie na HTTPS ma `Secure`, `HttpOnly`, `SameSite=Lax` i prefiks `__Host-`. Logowanie i wylogowanie sprawdzają źródło żądania. Liczba prób logowania jest ograniczona w D1.

Bez zapamiętywania cookie jest sesyjne, a sesja na serwerze wygasa najpóźniej po 12 godzinach. Zapamiętana sesja wygasa po 30 dniach od logowania. Przycisk **Wyloguj** unieważnia sesję tego urządzenia i usuwa jego lokalną kopię danych. Oczekujące wpisy trzeba najpierw zsynchronizować. Zmiana sekretu z nowym skrótem hasła unieważnia wcześniejsze sesje.

`scripts/setup-password-login.mjs` przyjmuje JSON `{email,password}` na standardowym wejściu. Generuje ignorowane przez Git pliki `.dev.vars` i `.sites-runtime/sad-login-secret.json`; nie zapisuje hasła. Uruchomienie tego skryptu z nowymi danymi wymaga ponownego ustawienia sekretu w Cloudflare. Nie uruchamiaj go podczas każdego buildu.

Po zbudowaniu lokalnego wariantu można uruchomić:

```sh
npx wrangler d1 execute sad2026 --local --config dist/server/wrangler.json --file cloudflare/schema.sql
npx wrangler dev --config dist/server/wrangler.json --local --port 5174
```

Test `scripts/check-password-login.mjs` przyjmuje takie samo wejście JSON i używa wyłącznie lokalnego Workera pod `127.0.0.1:5174`. Sprawdza logowanie, blokadę API, CSRF, pamiętanie urządzenia, zapis i odczyt, wylogowanie, zmianę tokenu oraz limit prób. Nie używa produkcyjnej bazy.

`node scripts/check-password-sessions.mjs` używa własnych losowych danych testowych oraz izolowanego workerd/D1. Sprawdza flagi cookie HTTPS, przechowywanie skrótów tokenów, czas sesji i jej unieważnianie. Nie wymaga rzeczywistego konta.

Źródła: [sekrety Workers](https://developers.cloudflare.com/workers/configuration/secrets/), [D1](https://developers.cloudflare.com/d1/get-started/), [Workers Builds](https://developers.cloudflare.com/workers/ci-cd/builds/configuration/), [przechowywanie haseł](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
