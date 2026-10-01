# Mój Sad — stan prac

Działająca wersja lokalna i prywatna publikacja, aktualizacja 01.10.2026.

## Zakres
- Wiśnia Łutówka oraz czereśnie Wanda, Vega, Techlovan, Burlat, Cordia, Ulster, Regina.
- Zbiory wiśni w kilogramach lub skrzynkach 5 i 10 kg; zbiory czereśni w skrzynkach. Osobne widoki wiśni i czereśni; dla czereśni wybór odmiany lub wszystkich.
- Opcjonalna cena sprzedaży w zł/kg, wartość sprzedaży i średnia cena z wpisów z podaną ceną. Eksport sezonu uwzględnia ilość, sposób podania masy, cenę i wartość.
- Kwatery jednego gatunku z wieloma odmianami czereśni, powierzchnia, początkowa liczba drzew, podkładka i rok sadzenia. Stare kwatery jednoodmianowe działają bez migracji danych.
- Statystyki rok do roku: kilogramy osobno dla gatunków i kwater, różnica kg/procent, osobne zbiory bez kwatery, wspólny wynik po zapisanych kosztach. Sezon 2025 usunięty z list wyboru bez kasowania danych.
- Magazyn, kolejne zakupy, wiele środków w zabiegu, kontrola zapasu i przeliczenie przy edycji/usunięciu. Lista zakupów według rocznego zużycia minus obecny stan; eksport TXT.
- Ceny za kg/l, wartości zakupów, średnia ważona cen i szacowana wartość zapasu. Przycisk przenosi szacowany koszt zużycia do kosztu zabiegu.
- Katalog 18 nazw środków, ręczne nawozy, osiem głównych faz BBCH + etap po zbiorach i własny opis; źródła w formularzach.
- Przypomnienia z wyprzedzeniem, oznaczanie jako zakończone, eksport ICS z alarmem. Przypomnienia w aplikacji po jej otwarciu; brak push przy zamknięciu.
- Ubytki i dosadzenia, walidacja nieujemnego stanu drzew.
- Oddzielne widoki oprysków, nawożenia i podlewania; starsze wpisy pozostałych prac dostępne w historii.
- Obserwacje; edycja i usuwanie wpisów z potwierdzeniem.
- CSV sezonu, pełna kopia JSON.
- D1 jako trwałe źródło danych, IndexedDB jako lokalna kopia i kolejka oczekujących zmian.
- Manifest PWA, ikony 192/512, service worker do powłoki offline w wersji produkcyjnej.

## Weryfikacja
- TypeScript: `node node_modules/typescript/bin/tsc --noEmit` — zaliczone.
- Kompilacja: `node scripts/run-framework.mjs build` — zaliczona.
- Reguły domenowe: `node --experimental-strip-types scripts/check-domain.ts` — zaliczone.
- Lokalny API: `node scripts/check-api.mjs` — zaliczone (autoryzacja, zapis, odczyt, edycja, duplikaty, konflikt wersji, równoległe zapisy, ujemne drzewa, zależności kwater).
- Przeglądarka 390 × 844: jeden sad z siedmioma odmianami, zbiór Reginy, porównanie lat, katalog, ceny zakupów, zużycie magazynu, koszt zabiegu, eksport TXT oraz ICS — sprawdzone. Usunięto wyłącznie własne dane testowe.
- WebMCP read_orchard_summary: prawidłowe dane odczytane; nieprawidłowe parametry odrzucone.
- Instalacja na fizycznym Androidzie i uruchomienie całej PWA offline: jeszcze niezweryfikowane.

## Uruchomienie lokalne
`node scripts/run-framework.mjs dev`

Podgląd: http://127.0.0.1:5173/

Lokalny przycisk logowania korzysta z symulacji startera (wyłącznie loopback). W publikacji tożsamość zapewnia platforma Sites.
Lokalna migracja `drizzle/0000_sudden_triathlon.sql` została już zastosowana — nie odtwarzać jej ponownie.

## Publikacja
Projekt jest już zarejestrowany jako prywatny. **Nie twórz kolejnego Site.**
Identyfikator jest zapisany w `.openai/hosting.json`: `appgprj_6abc1034f3e48191969a6f389af4fd16`.
Lokalne źródła znajdują się w checkout projektu Sites. Zachowaj dostęp owner-only i istniejący identyfikator projektu.
Na tym hoście wrapper npm uruchamiany przez dawny helper Sites błędnie szukał npm w checkout. Instalacja działała przez pełną ścieżkę `C:/Program Files/nodejs/node_modules/npm/bin/npm-cli.js`; build przez `node scripts/run-framework.mjs build`.

## Ograniczenia pierwszej wersji
- Jedna kwatera ma jeden gatunek, ale może mieć wiele odmian.
- Podsumowanie drzewa pokazuje bieżący łączny stan, a ubytki wybrany sezon.
- Ilość zabiegu jest łączna; dawkę na hektar można wpisać w uwagach.
- Dane gospodarstwa mieszczą się w jednym rekordzie D1; limit zabezpieczający wynosi 1,5 MB. Większe gospodarstwa/historyczne rejestry wymagają rozbudowy modelu na oddzielne tabele.
- Kolejka offline pracuje w jednej aktywnej karcie na urządzeniu. W przeglądarkach z Web Locks druga karta otrzymuje komunikat zamiast możliwości zapisu. Zapisy z różnych urządzeń mają kontrolę wersji po stronie serwera.
- Kopia JSON jest eksportem, nie ma jeszcze formularza importu.
