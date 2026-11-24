# Bezbednosni pregled (2026-11-24)

Pregled po OWASP Top 10 (2021) i ASVS nivo 2. Svaki nalaz je proveren napadom na kopiju backend-a (port 3002, baza zgrada_db) sa test nalozima. Markovi serveri 3000 i 4200 nisu radili tokom pregleda.

## Nalazi

### 1. Srednje: nema bezbednosnih zaglavlja (A05)
- Šta: odgovor otkriva `X-Powered-By: Express`, a nema `X-Content-Type-Options`, `X-Frame-Options`, CSP `frame-ancestors` ni HSTS.
- Ponovi: `curl -i http://localhost:3000/kvar`
- Ispravka: `app.use(helmet())` u `podesi-aplikaciju.ts` (NestJS docs, Security, Helmet).
- Test: `test/zaglavlja.e2e-spec.ts` pre ispravke pada, posle prolazi. Swagger radi uz CSP. Frontend e2e uz helmet: 67/67.
- **Stanje: urađeno** (helmet 8.3).

### 2. Srednje: ranjive zavisnosti u backend-u (A06)
- `body-parser` 2.3.0, DoS kroz kompresovano telo zahteva. **Pogađa nas**, jer server prima gzip telo. Provereno: `POST /auth/zaboravljena-lozinka` sa `Content-Encoding: gzip` daje 202.
- `multer` 2.4.0, DoS kad se koristi asinhroni `fileFilter`. Ne pogađa nas, jer ga ne koristimo.
- `qs` 6.16.0, DoS u `stringify` sa `arrayFormat: comma`. Ne pogađa nas.
- Ispravka: `npm audit fix` diže samo manje verzije (express 5.3, multer 2.5, body-parser 2.4). Posle toga `npm audit` javlja 0 ranjivosti. U kopiji prolazi 1437 testova i e2e 67.
- **Stanje: urađeno.**
- Frontend: `zod` 4.6.5 ne pogađa aplikaciju, jer ga `@angular/forms` ne uvozi u kod koji ide korisniku. Ispravka bi podigla i `@angular/cli` na 22.3, pa to ostaje za korak ažuriranja paketa.

### 3. Nisko: lični podaci u logu kad baza vrati grešku (A09)
- Šta: kad upis u bazu padne pri registraciji, u log je išao ceo `QueryFailedError` sa parametrima upita: bcrypt heš lozinke, telefon i email. Isto važi za slanje linka (email) i grešku mejla (adresa primaoca).
- Ponovi: `Logger.error('...', new QueryFailedError(upit, [email, hes, telefon], greska))` ispisuje `parameters: [...]`.
- Ispravka: `shared/stek-greske.ts`, pa se upisuje samo stek greške, bez parametara.
- Test: `bezbednost.e2e-spec.ts`, test „greška baze pri registraciji ne upisuje u log heš lozinke, telefon ni email“.

### 4. Nisko: bezbednosni događaji se nisu beležili (A09, ASVS V7.2)
- Šta: u logu se nije videlo ništa o neuspelim prijavama, zaključavanju, ukradenom kolačiću sesije, promeni uloge, deaktivaciji ni promeni lozinke.
- Ispravka: upozorenje ili zapis sa brojem naloga i IP adresom. Email i lozinka se ne upisuju (OWASP Logging Cheat Sheet).
- Test: 5 testova u `bezbednost.e2e-spec.ts`. Svaki pre ispravke pada, a posle prolazi.

## Provereno, nije ranjivo
- **Kontrola pristupa:** probao sam tuđ kvar, komentar, sliku, praćenje, glasanje, glas, sastanak, najavu, oglas, dokument, kontakte, stanare, stan i zahteve, iz druge zgrade i kao serviser. Svuda je 404 ili 403. Polja koja korisnik ne sme da pošalje (`uloga`, `email`, `zgradaId`) odbija `forbidNonWhitelisted`. Testovi `izolacija` i `prava` pokrivaju svaku rutu tabelom.
- **Socket:** u sobe se ulazi samo na serveru, po broju naloga i sesije iz tokena. Nema događaja za ulazak u tuđu sobu. Token se proverava i kad se obnavlja.
- **JWT:** token sa `alg: none` i token sa lažnim potpisom daju 401. Uloga se čita iz baze. Refresh token ima rotaciju i otkrivanje ponovne upotrebe. Kolačić je HttpOnly, SameSite=Strict, sa putanjom `/auth`, a Secure u produkciji.
- **Prijava i nalog:** isti odgovor za postojeći i nepostojeći nalog, bcrypt i kad nalog ne postoji (isto vreme odgovora), zaključavanje posle 5 pokušaja, throttler. Link iz mejla je jednokratan, traje 30 min ili 24 h, a u bazi je samo heš. Registracija uvek vraća 202.
- **SQL:** svi upiti koriste parametre. U tekst upita se ubacuju samo konstante iz koda. LIKE pretraga je zaštićena.
- **XSS:** nema `innerHTML` ni `bypassSecurityTrust`. Mejlovi ne sadrže tekst korisnika. Angular čisti `href`.
- **Fajlovi:** tip se proverava po sadržaju. HTML preimenovan u .jpg ili .pdf i SVG se odbijaju. Slike se ponovo kodiraju u WEBP. Ključ je UUID. Bucket je privatan: bez potpisa i sa izmenjenim ključem daje 403. Potpisan link traje 1 h.
- **Podešavanja:** CORS prima samo FRONTEND_URL. ValidationPipe ima whitelist i forbidNonWhitelisted. Greške ne otkrivaju unutrašnje detalje. Swagger se ne pokreće u produkciji. `trust proxy` se podešava preko env. Telo zahteva je ograničeno na 100 kb.
- **Push:** adresa pretplate je ograničena na poznate servise, pa nema SSRF.
- **Tajne:** `.env` i `garage.toml` nisu u gitu. U `.env.example` su samo lokalne vrednosti, a pravi JWT i Garage ključ se razlikuju od njih.
- **Frontend:** access token je samo u memoriji. U localStorage su samo oznake prikaza. Service worker ne kešira API (nema dataGroups).
- **Lični podaci:** stanar ne dobija tuđ email ni telefon. Serviser vidi kontakt samo uz kvar koji mu je dodeljen. Kontakti zgrade su javni namerno.

## Spisak za deploy
- HTTPS i sertifikat. `NODE_ENV=production`, da bi kolačić bio Secure i da se Swagger ne bi pokretao.
- `TRUST_PROXY=1` iza nginx-a, inače throttler i zaključavanje vide IP proksija.
- Nove tajne: JWT_SECRET, lozinka baze (u docker-compose je `zgrada_pass`), Garage ključevi i RPC tajna, VAPID. Ništa od lokalnih vrednosti.
- Zaglavlja za frontend na nginx-u: CSP (script-src 'self'), HSTS, nosniff, `frame-ancestors 'none'`.
- Garage na posebnom domenu, sa nosniff zaglavljem preko proksija.
- Portovi baze (5432), Garage admina (3903), RPC-a (3901) i Mailpit-a samo lokalno ili iza firewall-a. Pravi SMTP sa TLS-om.
- `synchronize: false` i migracije.
- Rotacija i rok čuvanja logova. Bekap baze i Garage-a, šifrovan.
- Ograničenje broja zahteva na nginx-u za otpremanje fajlova.
- `npm audit` u CI-ju.
