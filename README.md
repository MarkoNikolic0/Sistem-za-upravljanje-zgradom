# Sistem za upravljanje stambenom zgradom

Diplomski rad — veb aplikacija za upravljanje stambenom zgradom: kvarovi, oglasna tabla, ankete i odluke sa glasanjem, sastanci (skupština i zbor stanara). Uloge: stanar, upravnik, serviser i admin.

**Tehnologije:** NestJS 12 · Angular 22 · PrimeNG · Tailwind · PostgreSQL 18 · Garage (S3 skladište za slike) · Docker

```
backend/             NestJS API (port 3000), seed/seed.sql = test podaci
frontend/            Angular aplikacija (port 4200)
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

**2. Baza i skladište**

```powershell
docker compose up -d
```

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
```

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
| Admin | `marko@gmail.com` |
| Upravnik | `danijel@gmail.com` |
| Serviser | `petar@gmail.com` |
| Stanar | `marija@gmail.com` |

Ostali nalozi su na početku `backend/seed/seed.sql`.

## Ako nešto ne radi

- **Na računaru već postoji fajl `garage.toml` kao folder** — desi se kad se `docker compose up` pokrene pre koraka 1. Obriši folder, uradi `cp garage.toml.example garage.toml` i ponovo `docker compose up -d`.
- **Backend ne može da se poveže na bazu** — proveri da li Docker radi (`docker compose ps`) i da port 5432 ne zauzima lokalno instaliran PostgreSQL.
- **Slike se ne otpremaju** — nije urađen korak 3.
- **Seed javlja da tabela ne postoji** — backend nije pokrenut bar jednom; pokreni ga pa ponovi korak 5.
- **Git Bash umesto PowerShell-a** — ispred `docker exec ... /garage` komandi dodaj `MSYS_NO_PATHCONV=1`.
- **Brisanje svih podataka i početak iz nule** — `docker compose down -v`, pa ponovo od koraka 2.

## Ostale komande

| Folder | Komanda | Opis |
| --- | --- | --- |
| backend / frontend | `npm test` | testovi |
| backend / frontend | `npm run lint` | linter |
| backend / frontend | `npm run build` | produkcijski build |
| koren | `docker compose down` | zaustavlja kontejnere (podaci ostaju) |

> Vrednosti u `.env.example` fajlovima su samo za lokalni razvoj. Na pravom serveru promeni lozinku baze, `JWT_SECRET`, Garage ključ i `GARAGE_RPC_SECRET`, i postavi `NODE_ENV=production`.
