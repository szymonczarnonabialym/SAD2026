# Zarządzanie czeresniekoscian.pl z Mojego Sadu

Zakładka **Oferta na stronie** pozwala publikować cenę za kilogram, gatunek, nazwę odmiany, dostępność, widoczność oraz komunikat dla klientów. Działa we wdrożeniu na własnym Cloudflare. Cena w ofercie jest niezależna od ceny zapisanej przy zbiorze; nie przelicza danych historycznych.

**Wyłączenie i włączenie strony:** ustaw przełącznik **Strona włączona**, wybierz rok sezonu i kliknij **Opublikuj na stronie**. Wyłączona strona pokazuje tylko „Sezon 2026 zakończony — Zapraszamy w przyszłym roku!” (rok zgodny z ustawieniem) oraz dyskretny link do panelu. Cloudflare zwraca ten ekran bezpośrednio dla publicznych stron HTML, także bez JavaScript. Panel i logowanie pozostają dostępne. Oferta i ceny są zachowane w bazie; ponowne włączenie przywraca pełną stronę. Otwarte karty odświeżają tryb co minutę lub przy powrocie do karty. Po zmianie trybu nie trzeba wdrażać kodu. Dopóki nie klikniesz publikacji, przełącznik jest tylko zmianą w formularzu.

1. Zaloguj się dotychczasowym kontem, otwórz **Oferta na stronie**.
2. Uzupełnij ceny i wybierz: **Dostępne**, **Wkrótce**, **Wyprzedane** lub **Sezon zakończony**. Dostępna odmiana wymaga ceny większej od zera. Ukrywanie odmiany usuwa ją także z publicznego API.
3. Kliknij **Opublikuj na stronie**. Przycisk od razu zapisuje publiczną ofertę. Strona klienta odczytuje ją po odświeżeniu i co minutę. Zapis wymaga internetu; komunikat o błędzie pozostawia formularz do ponownej próby. Konflikt dwóch kart wymaga jawnego wczytania aktualnej oferty.

Nowa tabela `site_offer` powstaje automatycznie przy pierwszym odczycie. Nie zmienia tabeli `farms`, identyfikatorów właściciela ani sekretu logowania. Oferta nie zawiera zbiorów, oprysków, kosztów ani klientów. Początkowe dane formularza nie są publiczne, dopóki właściciel nie opublikuje oferty.

Wersja własna Cloudflare dodaje:

- `/panel` — dotychczasowa aplikacja; logowanie odsyła do tej ścieżki. Stary adres `/` Workera nadal działa.
- `GET /api/site-offer`, `PUT /api/site-offer` — wymagają dotychczasowej sesji. Zapis wymaga zgodnego Origin i wersji rekordu.
- `GET /api/public/offer` — tylko publiczne pola widocznych odmian; brak cache i brak CORS. Bez publikacji lub podczas awarii publiczny frontend wstrzymuje zamówienia.

Skonfiguruj stronę z drugiego repozytorium według [instrukcji stronawisnie](https://github.com/szymonczarnonabialym/stronawisnie/blob/main/README.md). Jej Worker kieruje panel i API do `sad2026` przez Service Binding. Docelowo strona jest pod `https://czeresniekoscian.pl/`, panel pod `https://czeresniekoscian.pl/panel`. Oba repozytoria i pipeline'y pozostają osobne. Cloudflare wymaga przypięcia domeny do Workera strony; sama aktualizacja HTML nie wystarczy.

Przed zmianą domeny najpierw zaktualizuj `sad2026` przez `npm run build:cloudflare`, zachowując istniejący `DB` i `SAD_LOGIN_CONFIG`. Nie zmieniaj dostępu Sites: wariant Sites pozostaje prywatnym rejestrem i nie udostępnia globalnej oferty. Jego panel wyjaśnia, że funkcja wymaga własnego Cloudflare.

Kontrola:

```sh
node node_modules/typescript/bin/tsc --noEmit
node --import ./scripts/sites-env.mjs scripts/check-site-offer.mjs
node --import ./scripts/sites-env.mjs scripts/check-password-sessions.mjs
npm run build:cloudflare
```

Test oferty korzysta z izolowanego workerd/D1 i losowego konta testowego. Nie czyta i nie modyfikuje produkcyjnej bazy. Nowy service worker przechowuje powłokę panelu oddzielnie według ścieżki; instalacja PWA wskazuje `/panel`. Publiczna strona nie jest zastępowana powłoką aplikacji offline.
