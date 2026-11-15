# Sistem za upravljanje stambenom zgradom

Diplomski rad — veb aplikacija za upravljanje stambenom zgradom: kvarovi, oglasna tabla, ankete i odluke sa glasanjem, sastanci (skupština i zbor stanara). Uloge: stanar, upravnik, serviser i admin.

**Tehnologije:** NestJS 12 · Angular 22 · PrimeNG · Tailwind · PostgreSQL 18 · Garage (S3 skladište za slike) · Docker

```
backend/             NestJS API (port 3000), seed/seed.sql = test podaci
backend/test/        e2e testovi backenda (jedinični su uz kod, src/**/*.spec.ts)
frontend/            Angular aplikacija (port 4200)
frontend/e2e/        e2e testovi kroz pregledač (jedinični su uz kod, src/**/*.spec.ts)
docker-compose.yml   PostgreSQL i Garage
```

## Potrebno

- [Node.js 24](https://nodejs.org/)
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (mora da bude pokrenut)
- Git

## Pokretanje

Komande su za **PowerShell**, iz korena projekta osim gde piše drugačije.

**1. Preuzimanje i konfiguracija**

```powershell
git clone https://github.com/MarkoNikolic0/Sistem-za-upravljanje-zgradom.git
cd Sistem-za-upravljanje-zgradom
cp .env.example .env
cp garage.toml.example garage.toml
cp backend/.env.example backend/.env
```

Primeri već sadrže sve vrednosti potrebne za lokalni rad, ništa ne treba menjati.

**2. Baza, skladište i mail**

```powershell
docker compose up -d
```

Mailovi koje aplikacija šalje (npr. link za novu lozinku) ne idu na prave adrese nego u Mailpit: http://localhost:8025

**3. Garage — samo prvi put**

```powershell
docker exec zgrada_garage /garage status
```

Iz ispisa prepiši ID čvora (dovoljno prvih nekoliko znakova) umesto `<ID>`:

```powershell
docker exec zgrada_garage /garage layout assign -z dc1 -c 1G <ID>
docker exec zgrada_garage /garage layout apply --version 1
docker exec zgrada_garage /garage bucket create zgrada-slike
docker exec zgrada_garage /garage key import --yes -n zgrada-key GKf20b264557e78c5b054a2a40 9774daf45883983cc5da726c0b237f351a84ffd3129c84f0440319cb34de9dd4
docker exec zgrada_garage /garage bucket allow --read --write --owner zgrada-slike --key zgrada-key
```

Ključ iz poslednje dve komande je isti kao u `backend/.env.example`.

**4. Backend** (prvi terminal)

```powershell
cd backend
npm install
npm run start:dev
```

Pri prvom pokretanju tabele se prave same. API: http://localhost:3000 · Swagger: http://localhost:3000/api

**5. Test podaci** (novi terminal, iz foldera `backend`, dok backend radi)

```powershell
docker cp seed/seed.sql zgrada_container:/tmp/seed.sql
docker exec zgrada_container sh -c 'psql -q -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/seed.sql'
node seed/fajlovi.mjs
```

Poslednja komanda otprema u Garage fajlove test podataka (zapisnik sa skupštine).

**6. Frontend** (novi terminal)

```powershell
cd frontend
npm install
npm start
```

Aplikacija: **http://localhost:4200**

Sledeći put su dovoljni koraci 2, 4 (`npm run start:dev`) i 6 (`npm start`).

## Test nalozi

Lozinka za sve: **`Zgrada123!`**

| Uloga | Email |
| --- | --- |
| Admin | `markonikolic287@gmail.com` |
| Upravnik | `danijel@gmail.com` |
| Serviser | `petar@gmail.com` |
| Stanar | `marija@gmail.com` |

Ostali nalozi su na početku `backend/seed/seed.sql`.

## Obaveštenja na uređaju i instalacija aplikacije

Uz običan `npm start` aplikacija radi, ali bez service worker-a: nema obaveštenja na uređaju (push), dugmeta „Instaliraj“ ni poruke o novoj verziji. Da bi se to probalo, frontend se pokreće u produkcijskoj konfiguraciji (iz foldera `frontend`, umesto koraka 6):

```powershell
npx ng serve --configuration production
```

Adresa ostaje http://localhost:4200. Obaveštenja se uključuju na stranici **Moj profil**. Pregledač ih dozvoljava samo na `localhost` ili preko HTTPS-a, pa za probu na telefonu treba USB prosleđivanje porta (Chrome, `chrome://inspect`) ili postavljena aplikacija.

## Testovi

Testovi backenda se pokreću iz foldera `backend`. Docker mora da radi (korak 2), backend ne mora.

| Komanda | Šta pokreće |
| --- | --- |
| `npm test` | sve testove |
| `npm run test:unit` | jedinične testove: male funkcije same za sebe, bez baze (`src/**/*.spec.ts`, uz kod koji proveravaju) |
| `npm run test:e2e` | e2e testove: ceo backend preko pravih zahteva (`test/*.e2e-spec.ts`) |

E2e testovi sami naprave privremenu bazu čije ime počinje sa `zgrada_e2e_` i odbijaju da rade nad bilo kojom drugom, pa se podaci iz razvojne baze ne diraju. Mailovi i skladište fajlova su u testu zamenjeni lažnim servisima.

| Fajl u `backend/test/` | Šta proverava |
| --- | --- |
| `izolacija.e2e-spec.ts` | korisnik jedne zgrade ne može da vidi ni izmeni podatke druge zgrade, za sve rute |
| `prava.e2e-spec.ts` | svaka uloga sme samo ono što joj pripada |
| `auth.e2e-spec.ts` | prijava, tokeni, zaključavanje, lozinka, potvrda emaila |
| `kvar`, `glasanje`, `sastanak`, `oglas`, `stanari` | glavni tokovi: statusi kvara, kvorum i većine, iseljenje |
| `sema.e2e-spec.ts` | oblik baze |
| `pomoc/` | pomoćni fajlovi: pokretanje aplikacije, test baza, test podaci, spisak ruta, lažni servisi |
| `pregledac/server.ts` | backend za e2e testove frontenda (vidi niže) |

Testovi frontenda se pokreću iz foldera `frontend`. Pre prvog pokretanja e2e testova jednom treba preuzeti pregledač: `npx playwright install chromium`.

| Komanda | Šta pokreće |
| --- | --- |
| `npm run test:sve` | sve testove frontenda, oko minut i po |
| `npm test` | jedinične testove: pravila, store-ovi, sesija i tokeni, pristup stranicama, notifikacije (`src/**/*.spec.ts`) |
| `npm run e2e` | e2e testove kroz pravi pregledač na ekranu telefona od 375px (`e2e/*.spec.ts`) |

E2e testovi sami pokrenu backend na portu 3100 (nad privremenom bazom `zgrada_e2e_`, sa lažnim mailom i skladištem) i frontend na portu 4300, pa mogu da rade dok su 3000 i 4200 pokrenuti. Na kraju se baza briše. Izveštaj o neuspelom testu je u `frontend/playwright-report` (`npx playwright show-report`).

| Fajl u `frontend/e2e/` | Šta proverava |
| --- | --- |
| `nalog.spec.ts` | registracija, aktivacija iz mejla, prijava, zahtev za stan i odobrenje |
| `kvar.spec.ts` | stanar prijavi kvar, upravnik ga prihvati i dodeli, serviser reši, stanar potvrdi; druga zgrada ga ne vidi |
| `glasanje.spec.ts`, `oglas.spec.ts` | anketa i glasanje, objava oglasa, šta vide komšije i druga zgrada |
| `sastanak.spec.ts` | skupština: zakazivanje, najava dolaska, evidencija prisustva, kvorum i zapisnik; otkazivanje zbora; druga zgrada je ne vidi |
| `odluka.spec.ts` | glasanje vlasnika o odluci, ishod posle roka i objava na tabli; ukućanin je ne vidi |
| `lozinka.spec.ts` | zaboravljena lozinka preko linka iz mejla |
| `obavestenja.spec.ts` | obaveštenje stiže odmah, bez osvežavanja stranice |
| `pristup.spec.ts` | preusmeravanje gosta i uloga koje nemaju pravo na stranicu |

## Ako nešto ne radi

- **Na računaru već postoji fajl `garage.toml` kao folder** — desi se kad se `docker compose up` pokrene pre koraka 1. Obriši folder, uradi `cp garage.toml.example garage.toml` i ponovo `docker compose up -d`.
- **Backend ne može da se poveže na bazu** — proveri da li Docker radi (`docker compose ps`) i da port 5432 ne zauzima lokalno instaliran PostgreSQL.
- **Slike se ne otpremaju** — nije urađen korak 3.
- **Seed javlja da tabela ne postoji** — backend nije pokrenut bar jednom; pokreni ga pa ponovi korak 5.
- **Posle preuzimanja nove verzije niko ne može da se prijavi ili backend ne startuje** — baza je napravljena pre potvrde emaila. Iz foldera `backend` pokreni `docker cp seed/nadogradnja-potvrda-emaila.sql zgrada_container:/tmp/nadogradnja.sql` i `docker exec zgrada_container sh -c 'psql -q -U $POSTGRES_USER -d $POSTGRES_DB -f /tmp/nadogradnja.sql'`, pa ponovo pokreni backend.
- **Git Bash umesto PowerShell-a** — ispred `docker exec ... /garage` komandi dodaj `MSYS_NO_PATHCONV=1`.
- **Brisanje svih podataka i početak iz nule** — `docker compose down -v`, pa ponovo od koraka 2.

## Ostale komande

| Folder | Komanda | Opis |
| --- | --- | --- |
| backend | `npm test` | testovi (vidi Testovi) |
| frontend | `npm run test:sve` | testovi (vidi Testovi) |
| frontend | `npx ng serve --configuration production` | pokretanje sa service worker-om (obaveštenja, instalacija) |
| backend / frontend | `npm run lint` | linter |
| backend / frontend | `npm run build` | produkcijski build |
| koren | `docker compose down` | zaustavlja kontejnere (podaci ostaju) |

> Vrednosti u `.env.example` fajlovima su samo za lokalni razvoj. Na pravom serveru promeni lozinku baze, `JWT_SECRET`, Garage ključ i `GARAGE_RPC_SECRET`, napravi nove VAPID ključeve (`npx web-push generate-vapid-keys` u `backend`, pa `VAPID_JAVNI_KLJUC`, `VAPID_PRIVATNI_KLJUC` i `VAPID_KONTAKT` sa pravom adresom), podesi pravi SMTP servis (`SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_KORISNIK`, `SMTP_LOZINKA`, `MAIL_OD`) i postavi `NODE_ENV=production`.
