-- Test podaci za razvoj i demonstraciju: tri zgrade u Nisu, stanovi, upravnici, serviseri,
-- stanari, zahtevi za povezivanje, kvarovi u razlicitim statusima, oglasi i ankete.
--
-- Pokretanje (iz foldera backend, dok radi Docker kontejner):
--   docker exec -i zgrada_container sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < seed/seed.sql
--
-- Svi test nalozi imaju lozinku: Zgrada123!
-- Izuzetak: prvi nalozi napravljeni rucno (marko@, marija@, danijel@, petar@gmail.com) zadrzavaju
-- lozinku koju vec imaju u bazi; Zgrada123! dobijaju samo ako ih skripta pravi u praznoj bazi.
-- Email adrese novih naloga su na domenu example.com (rezervisan za primere, RFC 2606).
-- Skripta se moze pokrenuti vise puta: postojeci podaci (isti email, zgrada, stan) se preskacu,
-- a kvarovi, oglasi i ankete iz skripte se vracaju na pocetno stanje sa svezim datumima.

BEGIN;

-- ZGRADE ------------------------------------------------------------------------------------
INSERT INTO zgrada (naziv, adresa, "brojSpratova", "brojStanova")
SELECT v.naziv, v.adresa, v.spratovi, v.stanovi
FROM (VALUES
  ('Delta Residence', 'Bulevar Nemanjića 45, Niš', 6, 20),
  ('Stambena zgrada Obrenovićeva', 'Obrenovićeva 30, Niš', 5, 15),
  ('Lamela Vizantijski', 'Vizantijski bulevar 12, Niš', 8, 32)
) AS v(naziv, adresa, spratovi, stanovi)
WHERE NOT EXISTS (SELECT 1 FROM zgrada z WHERE z.adresa = v.adresa);

-- STANOVI -----------------------------------------------------------------------------------
INSERT INTO stan (broj, sprat, kvadratura, "zgradaId")
SELECT v.broj, v.sprat, v.kvadratura, z.id
FROM (VALUES
  -- Delta Residence: svih 20 stanova
  ('Bulevar Nemanjića 45, Niš', '1', 0, 38),
  ('Bulevar Nemanjića 45, Niš', '2', 1, 48),
  ('Bulevar Nemanjića 45, Niš', '3', 1, 52),
  ('Bulevar Nemanjića 45, Niš', '4', 1, 66),
  ('Bulevar Nemanjića 45, Niš', '5', 1, 72),
  ('Bulevar Nemanjića 45, Niš', '6', 2, 45),
  ('Bulevar Nemanjića 45, Niš', '7', 2, 58),
  ('Bulevar Nemanjića 45, Niš', '8', 2, 61),
  ('Bulevar Nemanjića 45, Niš', '9', 2, 55),
  ('Bulevar Nemanjića 45, Niš', '10', 3, 44),
  ('Bulevar Nemanjića 45, Niš', '11', 3, 63),
  ('Bulevar Nemanjića 45, Niš', '12', 3, 70),
  ('Bulevar Nemanjića 45, Niš', '13', 3, 49),
  ('Bulevar Nemanjića 45, Niš', '14', 3, 60),
  ('Bulevar Nemanjića 45, Niš', '15', 4, 64),
  ('Bulevar Nemanjića 45, Niš', '16', 4, 57),
  ('Bulevar Nemanjića 45, Niš', '17', 4, 82),
  ('Bulevar Nemanjića 45, Niš', '18', 5, 46),
  ('Bulevar Nemanjića 45, Niš', '19', 5, 80),
  ('Bulevar Nemanjića 45, Niš', '20', 5, 74),
  ('Obrenovićeva 30, Niš', '1', 0, 42),
  ('Obrenovićeva 30, Niš', '4', 1, 58),
  ('Obrenovićeva 30, Niš', '7', 2, 63),
  ('Obrenovićeva 30, Niš', '10', 3, 47),
  ('Obrenovićeva 30, Niš', '13', 4, 75),
  ('Vizantijski bulevar 12, Niš', '3', 1, 39),
  ('Vizantijski bulevar 12, Niš', '8', 2, 61),
  ('Vizantijski bulevar 12, Niš', '16', 4, 52),
  ('Vizantijski bulevar 12, Niš', '22', 6, 68),
  ('Vizantijski bulevar 12, Niš', '30', 8, 85)
) AS v(adresa, broj, sprat, kvadratura)
JOIN zgrada z ON z.adresa = v.adresa
WHERE NOT EXISTS (SELECT 1 FROM stan s WHERE s."zgradaId" = z.id AND s.broj = v.broj);

-- KORISNICI (lozinka za sve: Zgrada123!) ----------------------------------------------------
INSERT INTO korisnik (ime, prezime, email, telefon, lozinka, uloga, "zgradaId")
SELECT v.ime, v.prezime, v.email, v.telefon,
       '$2b$10$vA3jA/dFn0F49Jati8I25etyp5KMizffmKsZr3odS8BDAhmdnk44i',
       v.uloga::korisnik_uloga_enum,
       (SELECT id FROM zgrada WHERE adresa = v.zgrada)
FROM (VALUES
  -- prvi nalozi napravljeni rucno (zadrzavaju svoju lozinku ako vec postoje)
  ('Marko', 'Nikolic', 'marko@gmail.com', '+381600000001', 'admin', NULL),
  ('Marija', 'Stankovic', 'marija@gmail.com', '+381600000012', 'stanar', NULL),
  ('Danijel', 'Stojanovic', 'danijel@gmail.com', '+381600000003', 'upravnik', 'Bulevar Nemanjića 45, Niš'),
  ('Petar', 'Mirkovic', 'petar@gmail.com', '+381600000004', 'serviser', NULL),
  -- upravnici
  ('Jelena', 'Marković', 'jelena.markovic@example.com', '+381631234501', 'upravnik', 'Obrenovićeva 30, Niš'),
  ('Nikola', 'Ilić', 'nikola.ilic@example.com', '+381641234502', 'upravnik', 'Vizantijski bulevar 12, Niš'),
  -- serviseri
  ('Dragan', 'Petrović', 'dragan.petrovic@example.com', '+381651234503', 'serviser', NULL),
  ('Zoran', 'Đorđević', 'zoran.djordjevic@example.com', '+381661234504', 'serviser', NULL),
  -- stanari
  ('Ana', 'Jovanović', 'ana.jovanovic@example.com', '+381601234505', 'stanar', NULL),
  ('Milan', 'Stojković', 'milan.stojkovic@example.com', '+381611234506', 'stanar', NULL),
  ('Ivana', 'Nikolić', 'ivana.nikolic@example.com', '+381621234507', 'stanar', NULL),
  ('Stefan', 'Popović', 'stefan.popovic@example.com', '+381631234508', 'stanar', NULL),
  ('Milica', 'Đorđević', 'milica.djordjevic@example.com', '+381641234509', 'stanar', NULL),
  ('Nemanja', 'Kostić', 'nemanja.kostic@example.com', '+381651234510', 'stanar', NULL),
  ('Tijana', 'Pavlović', 'tijana.pavlovic@example.com', '+381661234511', 'stanar', NULL),
  ('Aleksandar', 'Ristić', 'aleksandar.ristic@example.com', '+381601234512', 'stanar', NULL),
  ('Jovana', 'Mitić', 'jovana.mitic@example.com', '+381611234513', 'stanar', NULL),
  ('Uroš', 'Savić', 'uros.savic@example.com', '+381621234514', 'stanar', NULL),
  -- stanari Delta Residence
  ('Natalija', 'Stojadinović', 'natalija.stojadinovic@example.com', '+381631234525', 'stanar', NULL),
  ('Vesna', 'Đokić', 'vesna.djokic@example.com', '+381601234517', 'stanar', NULL),
  ('Dejan', 'Milosavljević', 'dejan.milosavljevic@example.com', '+381611234518', 'stanar', NULL),
  ('Sanja', 'Milosavljević', 'sanja.milosavljevic@example.com', '+381621234519', 'stanar', NULL),
  ('Bojan', 'Tasić', 'bojan.tasic@example.com', '+381631234520', 'stanar', NULL),
  ('Marina', 'Cvetković', 'marina.cvetkovic@example.com', '+381641234521', 'stanar', NULL),
  ('Goran', 'Stamenković', 'goran.stamenkovic@example.com', '+381651234522', 'stanar', NULL),
  -- stanari bez stana (za testiranje povezivanja)
  ('Katarina', 'Lazić', 'katarina.lazic@example.com', '+381631234515', 'stanar', NULL),
  ('Luka', 'Živković', 'luka.zivkovic@example.com', '+381641234516', 'stanar', NULL),
  ('Milena', 'Jovanović', 'milena.jovanovic@example.com', '+381661234523', 'stanar', NULL),
  ('Đorđe', 'Ranđelović', 'djordje.randjelovic@example.com', '+381601234524', 'stanar', NULL)
) AS v(ime, prezime, email, telefon, uloga, zgrada)
ON CONFLICT (email) DO NOTHING;

-- SPECIJALNOSTI SERVISERA -------------------------------------------------------------------
INSERT INTO serviser_specijalnost ("korisnikId", kategorija)
SELECT k.id, v.kategorija::serviser_specijalnost_kategorija_enum
FROM (VALUES
  -- Petar (glavni nalog za testiranje) radi sve vrste, da upravnik uvek moze da mu dodeli kvar
  ('petar@gmail.com', 'vodovod'),
  ('petar@gmail.com', 'grejanje'),
  ('petar@gmail.com', 'struja'),
  ('petar@gmail.com', 'lift'),
  ('petar@gmail.com', 'gradjevina'),
  ('petar@gmail.com', 'stolarija'),
  ('petar@gmail.com', 'ciscenje'),
  ('petar@gmail.com', 'ostalo'),
  ('dragan.petrovic@example.com', 'vodovod'),
  ('dragan.petrovic@example.com', 'grejanje'),
  ('zoran.djordjevic@example.com', 'struja'),
  ('zoran.djordjevic@example.com', 'lift')
) AS v(email, kategorija)
JOIN korisnik k ON k.email = v.email
ON CONFLICT ("korisnikId", kategorija) DO NOTHING;

-- VEZE STANAR - STAN ------------------------------------------------------------------------
INSERT INTO stanar_stana ("korisnikId", "stanId", vlasnik)
SELECT k.id, s.id, v.vlasnik
FROM (VALUES
  -- stan 14 u Delta Residence: Marija je vlasnik, Natalija zivi sa njom
  ('marija@gmail.com', 'Bulevar Nemanjića 45, Niš', '14', true),
  ('natalija.stojadinovic@example.com', 'Bulevar Nemanjića 45, Niš', '14', false),
  -- ostali stanari Delta Residence
  ('vesna.djokic@example.com', 'Bulevar Nemanjića 45, Niš', '1', true),
  ('dejan.milosavljevic@example.com', 'Bulevar Nemanjića 45, Niš', '6', true),
  ('sanja.milosavljevic@example.com', 'Bulevar Nemanjića 45, Niš', '6', true),
  ('bojan.tasic@example.com', 'Bulevar Nemanjića 45, Niš', '10', true),
  ('marina.cvetkovic@example.com', 'Bulevar Nemanjića 45, Niš', '12', true),
  ('goran.stamenkovic@example.com', 'Bulevar Nemanjića 45, Niš', '18', false),
  ('ana.jovanovic@example.com', 'Bulevar Nemanjića 45, Niš', '2', true),
  ('milan.stojkovic@example.com', 'Bulevar Nemanjića 45, Niš', '5', true),
  ('ivana.nikolic@example.com', 'Bulevar Nemanjića 45, Niš', '5', false),
  ('stefan.popovic@example.com', 'Bulevar Nemanjića 45, Niš', '15', true),
  ('milica.djordjevic@example.com', 'Obrenovićeva 30, Niš', '4', true),
  ('nemanja.kostic@example.com', 'Obrenovićeva 30, Niš', '7', true),
  ('tijana.pavlovic@example.com', 'Obrenovićeva 30, Niš', '10', false),
  ('aleksandar.ristic@example.com', 'Vizantijski bulevar 12, Niš', '8', true),
  ('jovana.mitic@example.com', 'Vizantijski bulevar 12, Niš', '16', true),
  ('uros.savic@example.com', 'Vizantijski bulevar 12, Niš', '22', false),
  -- upravnik Obrenoviceve je i vlasnik stana u svojoj zgradi
  ('jelena.markovic@example.com', 'Obrenovićeva 30, Niš', '13', true),
  -- upravnik Delte je vlasnik stana 7 (upravnik bez stana za testove: nikola.ilic)
  ('danijel@gmail.com', 'Bulevar Nemanjića 45, Niš', '7', true)
) AS v(email, adresa, broj, vlasnik)
JOIN korisnik k ON k.email = v.email
JOIN zgrada z ON z.adresa = v.adresa
JOIN stan s ON s."zgradaId" = z.id AND s.broj = v.broj
ON CONFLICT ("korisnikId", "stanId") DO NOTHING;

-- ZAHTEVI ZA POVEZIVANJE --------------------------------------------------------------------
INSERT INTO zahtev_povezivanje ("korisnikId", "stanId", status, "datumPodnosenjaZahteva")
SELECT k.id, s.id, v.status::zahtev_povezivanje_status_enum, now() - v.pre
FROM (VALUES
  -- Delta Residence: vise zahteva na cekanju i istorija (za stranu upravnika i paginaciju)
  ('katarina.lazic@example.com', 'Bulevar Nemanjića 45, Niš', '9', 'na_cekanju', interval '2 hours'),
  ('milena.jovanovic@example.com', 'Bulevar Nemanjića 45, Niš', '20', 'na_cekanju', interval '30 minutes'),
  ('djordje.randjelovic@example.com', 'Bulevar Nemanjića 45, Niš', '13', 'na_cekanju', interval '1 day'),
  ('djordje.randjelovic@example.com', 'Bulevar Nemanjića 45, Niš', '3', 'odbijen', interval '4 days'),
  ('natalija.stojadinovic@example.com', 'Bulevar Nemanjića 45, Niš', '14', 'prihvacen', interval '25 days'),
  ('vesna.djokic@example.com', 'Bulevar Nemanjića 45, Niš', '1', 'prihvacen', interval '20 days'),
  ('bojan.tasic@example.com', 'Bulevar Nemanjića 45, Niš', '10', 'prihvacen', interval '15 days'),
  ('marina.cvetkovic@example.com', 'Bulevar Nemanjića 45, Niš', '12', 'prihvacen', interval '10 days'),
  ('goran.stamenkovic@example.com', 'Bulevar Nemanjića 45, Niš', '18', 'prihvacen', interval '7 days'),
  -- ostale zgrade
  ('luka.zivkovic@example.com', 'Obrenovićeva 30, Niš', '1', 'na_cekanju', interval '1 day'),
  ('luka.zivkovic@example.com', 'Vizantijski bulevar 12, Niš', '3', 'odbijen', interval '5 days'),
  ('uros.savic@example.com', 'Vizantijski bulevar 12, Niš', '30', 'na_cekanju', interval '3 hours')
) AS v(email, adresa, broj, status, pre)
JOIN korisnik k ON k.email = v.email
JOIN zgrada z ON z.adresa = v.adresa
JOIN stan s ON s."zgradaId" = z.id AND s.broj = v.broj
WHERE NOT EXISTS (
  SELECT 1 FROM zahtev_povezivanje zp WHERE zp."korisnikId" = k.id AND zp."stanId" = s.id
);

-- KVAROVI ------------------------------------------------------------------------------------
-- Kvarovi iz ove skripte se pri svakom pokretanju vracaju na pocetno stanje: status, serviser i
-- datumi se racunaju od sadasnjeg trenutka, a njihovi komentari, istorija i pratioci pisu iznova.
-- Tako su glavni test primeri uvek na vrhu liste, sa svezim rokovima. Slike ostaju (fajlovi su u
-- Garage-u), a kvarovi koji nisu iz skripte se ne diraju.
--
-- Glavni nalozi za proveru (Delta Residence):
--   Marija (stan 14): sve faze kvara u stanu, rok prekoracen, potvrda resenja, vracen kvar,
--     dolazak servisera; prati tudji zajednicki kvar, a njen lift prate drugi
--   Marija: povucena prijava sa razlogom; ventilator moze da povuce, lift ne (prate ga drugi)
--   Danijel (upravnik): prihvati/odbij, dodeli, rok danas/sutra/prekoracen; kao vlasnik stana 7
--     potvrdjuje resen kvar; prati Marijin lift
--   Petar (serviser): dodeljen bez dolaska i sa dolaskom, u toku, vracen, resen, u sve tri zgrade
-- Pri prijavi kvara u zajednickom prostoru Marija vidi: Lift (svoj), Grejanje (vec ga prati),
-- Struja (interfon bez pratilaca, svetlo na stepenistu sa jednim pratiocem).
-- rok za resavanje = prijava + 2 / 7 / 21 dan (isto kao DANA_ZA_RESAVANJE u kvar.constants.ts)
CREATE TEMP TABLE seed_kvar ON COMMIT DROP AS
SELECT v.naslov, v.opis,
       v.kategorija::kvar_kategorija_enum AS kategorija,
       v.lokacija::kvar_lokacijatip_enum AS lokacija,
       v.prioritet::kvar_prioritet_enum AS prioritet,
       v.status::kvar_status_enum AS status,
       z.id AS zgrada_id, s.id AS stan_id, k.id AS korisnik_id, ser.id AS serviser_id,
       now() - v.pre AS datum_prijave,
       now() - v.pre + CASE v.prioritet
         WHEN 'hitno' THEN interval '2 days'
         WHEN 'srednje' THEN interval '7 days'
         ELSE interval '21 days'
       END AS rok,
       now() - v.resen AS datum_resenja,
       v.dolazak
FROM (VALUES
  -- Marijin stan 14 i zajednicki kvarovi Delte: najnoviji, da budu na vrhu liste
  ('Ne radi ventilator u kupatilu', 'Ventilator u kupatilu ne radi, ogledalo se magli posle tuširanja.',
   'struja', 'privatni_stan', 'srednje', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', '14', 'marija@gmail.com', NULL, interval '30 minutes', NULL, NULL),
  ('Ne radi lift', 'Lift zaglavljen između spratova',
   'lift', 'zajednicki_prostor', 'srednje', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', NULL, 'marija@gmail.com', NULL, interval '2 hours', NULL, NULL),
  ('Ne radi grejanje u celoj zgradi', 'Od jutros su hladni radijatori u svim stanovima koje sam pitao.',
   'grejanje', 'zajednicki_prostor', 'hitno', 'u_toku',
   'Bulevar Nemanjića 45, Niš', NULL, 'sanja.milosavljevic@example.com', 'petar@gmail.com', interval '3 hours', NULL,
   date_trunc('hour', now()) + interval '2 hours'),
  ('Curi ispod veš mašine', 'Posle pranja ispod veš mašine ostane bara, curi negde kod creva.',
   'vodovod', 'privatni_stan', 'srednje', 'dodeljen',
   'Bulevar Nemanjića 45, Niš', '14', 'natalija.stojadinovic@example.com', 'petar@gmail.com', interval '6 hours', NULL,
   (date_trunc('day', now() AT TIME ZONE 'Europe/Belgrade') + interval '1 day 10 hours') AT TIME ZONE 'Europe/Belgrade'),
  ('Ne radi bojler', 'Bojler u kupatilu ne greje vodu, lampica na njemu ne svetli.',
   'vodovod', 'privatni_stan', 'srednje', 'resen',
   'Bulevar Nemanjića 45, Niš', '14', 'marija@gmail.com', 'petar@gmail.com', interval '1 day', interval '2 hours', NULL),
  ('Curi voda iz bojlera', 'Ispod bojlera u kupatilu stalno kaplje, isključila sam ga iz struje.',
   'vodovod', 'privatni_stan', 'hitno', 'u_toku',
   'Bulevar Nemanjića 45, Niš', '1', 'vesna.djokic@example.com', 'petar@gmail.com', interval '1 day 2 hours', NULL, NULL),
  -- Danijel je i vlasnik stana 7: na resenom kvaru u svom stanu vidi i Potvrdu i Upravljanje
  ('Ne radi zvono na vratima stana', 'Zvono na ulaznim vratima stana ne zvoni, dugme se zaglavljuje.',
   'struja', 'privatni_stan', 'nisko', 'resen',
   'Bulevar Nemanjića 45, Niš', '7', 'danijel@gmail.com', 'petar@gmail.com', interval '1 day 4 hours', interval '1 hour', NULL),
  -- hitno, prihvacen pre skoro dva dana: rok istice danas
  ('Ne radi svetlo na stepeništu', 'Na trećem spratu ne radi svetlo već dva dana, mrak je uveče.',
   'struja', 'zajednicki_prostor', 'hitno', 'prihvacen',
   'Bulevar Nemanjića 45, Niš', NULL, 'milan.stojkovic@example.com', NULL, interval '1 day 20 hours', NULL, NULL),
  -- vracen serviseru (istorija je niže)
  ('Slab mlaz vode u tušu', 'Iz tuša jedva curi voda, ostale slavine rade normalno.',
   'vodovod', 'privatni_stan', 'srednje', 'u_toku',
   'Bulevar Nemanjića 45, Niš', '14', 'marija@gmail.com', 'petar@gmail.com', interval '2 days', NULL, NULL),
  -- hitno, jos nije dodeljen: rok prekoracen
  ('Ne zatvara se prozor u spavaćoj sobi', 'Krilo prozora u spavaćoj sobi ne može da se zatvori do kraja, duva.',
   'stolarija', 'privatni_stan', 'hitno', 'prihvacen',
   'Bulevar Nemanjića 45, Niš', '14', 'marija@gmail.com', NULL, interval '2 days 6 hours', NULL, NULL),
  ('Ne radi interfon', 'Interfon ne zvoni u stanovima na trećem spratu, ne može da se otvori ulaz.',
   'struja', 'zajednicki_prostor', 'srednje', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', NULL, 'bojan.tasic@example.com', NULL, interval '2 days 12 hours', NULL, NULL),
  ('Napukla pločica u kupatilu', 'Jedna pločica na zidu pored kade je napukla.',
   'gradjevina', 'privatni_stan', 'nisko', 'odbijen',
   'Bulevar Nemanjića 45, Niš', '14', 'marija@gmail.com', NULL, interval '2 days 12 hours', NULL, NULL),
  ('Curi slavina', 'Slavina u kupatilu curi neprestano',
   'vodovod', 'privatni_stan', 'srednje', 'zatvoren',
   'Bulevar Nemanjića 45, Niš', '14', 'marija@gmail.com', 'petar@gmail.com', interval '3 days', interval '2 days', NULL),
  ('Zaglavljuje se brava na vratima stana', 'Ključ teško ulazi u bravu ulaznih vrata i zaglavljuje se.',
   'stolarija', 'privatni_stan', 'srednje', 'povucen',
   'Bulevar Nemanjića 45, Niš', '14', 'marija@gmail.com', NULL, interval '1 day 6 hours', NULL, NULL),
  -- odbijen posle prihvatanja (istorija je nize)
  ('Nema signala sa zajedničke antene', 'Na televizorima nema signala sa antene na krovu, kablovska radi.',
   'ostalo', 'zajednicki_prostor', 'nisko', 'odbijen',
   'Bulevar Nemanjića 45, Niš', NULL, 'goran.stamenkovic@example.com', NULL, interval '3 days 4 hours', NULL, NULL),
  -- Petar u druge dve zgrade: filter po zgradi i svi statusi servisera
  ('Nema tople vode', 'Od jutros nema tople vode u stanu, bojler je uključen.',
   'vodovod', 'privatni_stan', 'hitno', 'u_toku',
   'Vizantijski bulevar 12, Niš', '16', 'jovana.mitic@example.com', 'petar@gmail.com', interval '5 hours', NULL, NULL),
  -- dodeljen, hitno, bez dolaska: rok prekoracen, Petar treba da upise dolazak
  ('Curi cev u podrumu', 'Iz cevi pored vodomera u podrumu curi voda, pod je mokar.',
   'vodovod', 'zajednicki_prostor', 'hitno', 'dodeljen',
   'Obrenovićeva 30, Niš', NULL, 'nemanja.kostic@example.com', 'petar@gmail.com', interval '2 days 12 hours', NULL, NULL),
  ('Hladan radijator u kupatilu', 'Radijator u kupatilu je hladan, ostali u stanu greju.',
   'grejanje', 'privatni_stan', 'srednje', 'u_toku',
   'Obrenovićeva 30, Niš', '10', 'tijana.pavlovic@example.com', 'petar@gmail.com', interval '3 days', NULL, NULL),
  ('Lupaju cevi grejanja', 'Kad se uključi grejanje, cevi na stepeništu glasno lupaju.',
   'grejanje', 'zajednicki_prostor', 'nisko', 'resen',
   'Vizantijski bulevar 12, Niš', NULL, 'aleksandar.ristic@example.com', 'petar@gmail.com', interval '3 days', interval '2 days', NULL),
  ('Kaplje ventil na radijatoru', 'Ventil na radijatoru u dnevnoj sobi kaplje, stavio sam posudu ispod.',
   'grejanje', 'privatni_stan', 'srednje', 'dodeljen',
   'Vizantijski bulevar 12, Niš', '22', 'uros.savic@example.com', 'petar@gmail.com', interval '3 days 6 hours', NULL, NULL),
  ('Slab pritisak vode', 'U kuhinji i kupatilu voda jedva teče, posebno uveče.',
   'vodovod', 'privatni_stan', 'nisko', 'zatvoren',
   'Obrenovićeva 30, Niš', '4', 'milica.djordjevic@example.com', 'petar@gmail.com', interval '25 days', NULL, NULL),
  ('Curi vodokotlić', 'Vodokotlić stalno pušta vodu u šolju.',
   'vodovod', 'privatni_stan', 'srednje', 'zatvoren',
   'Vizantijski bulevar 12, Niš', '8', 'aleksandar.ristic@example.com', 'petar@gmail.com', interval '14 days', NULL, NULL),
  -- Ostali kvarovi (stariji, ispod glavnih): lista, filter i paginacija
  ('Lift stoji između spratova', 'Lift se zaustavio između drugog i trećeg sprata, ne reaguje na dugmad.',
   'lift', 'zajednicki_prostor', 'hitno', 'u_toku',
   'Obrenovićeva 30, Niš', NULL, 'milica.djordjevic@example.com', 'zoran.djordjevic@example.com', interval '5 hours', NULL, NULL),
  ('Ne zatvaraju se ulazna vrata zgrade', 'Brava na ulaznim vratima ne hvata, vrata ostaju otvorena.',
   'stolarija', 'zajednicki_prostor', 'srednje', 'prijavljen',
   'Obrenovićeva 30, Niš', NULL, 'nemanja.kostic@example.com', NULL, interval '1 day', NULL, NULL),
  ('Curenje vode ispod sudopere', 'Od jutros curi voda ispod sudopere, ispod je mokar ormarić. Zatvorio sam ventil.',
   'vodovod', 'privatni_stan', 'srednje', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', '2', 'ana.jovanovic@example.com', NULL, interval '3 days', NULL, NULL),
  ('Ne greje radijator u spavaćoj sobi', 'Radijator u spavaćoj sobi je hladan, ostali u stanu greju normalno.',
   'grejanje', 'privatni_stan', 'srednje', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', '6', 'dejan.milosavljevic@example.com', NULL, interval '3 days 12 hours', NULL, NULL),
  ('Vlaga na zidu u spavaćoj sobi', 'Na zidu prema fasadi se pojavila vlaga i buđ, širi se posle kiše.',
   'gradjevina', 'privatni_stan', 'srednje', 'prihvacen',
   'Bulevar Nemanjića 45, Niš', '12', 'marina.cvetkovic@example.com', NULL, interval '4 days', NULL, NULL),
  ('Pukla cev grejanja u dnevnoj sobi', 'Iz radijatora u dnevnoj sobi kaplje voda, ispod je bara.',
   'grejanje', 'privatni_stan', 'hitno', 'dodeljen',
   'Bulevar Nemanjića 45, Niš', '15', 'stefan.popovic@example.com', 'dragan.petrovic@example.com', interval '4 days', NULL, NULL),
  ('Prljavo stepenište posle renoviranja', 'Posle renoviranja stana na drugom spratu stepenište je puno prašine i šuta.',
   'ciscenje', 'zajednicki_prostor', 'nisko', 'prihvacen',
   'Bulevar Nemanjića 45, Niš', NULL, 'stefan.popovic@example.com', NULL, interval '4 days 2 hours', NULL, NULL),
  ('Pokvaren poštanski sandučić', 'Vratanca sandučića za stan 1 su iskrivljena i ne mogu da se zaključaju.',
   'ostalo', 'zajednicki_prostor', 'nisko', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', NULL, 'vesna.djokic@example.com', NULL, interval '4 days 6 hours', NULL, NULL),
  ('Ne radi utičnica u kuhinji', 'Utičnica pored frižidera ne radi, osigurač nije iskočio.',
   'struja', 'privatni_stan', 'srednje', 'prihvacen',
   'Bulevar Nemanjića 45, Niš', '18', 'goran.stamenkovic@example.com', NULL, interval '5 days', NULL, NULL),
  ('Neprijatan miris iz odvoda u podrumu', 'Iz podnog odvoda u podrumu se širi miris kanalizacije.',
   'vodovod', 'zajednicki_prostor', 'srednje', 'dodeljen',
   'Bulevar Nemanjića 45, Niš', NULL, 'milan.stojkovic@example.com', 'dragan.petrovic@example.com', interval '5 days', NULL, NULL),
  ('Ne radi svetlo u liftu', 'U kabini lifta ne radi svetlo, vožnja je u mraku.',
   'struja', 'zajednicki_prostor', 'srednje', 'resen',
   'Bulevar Nemanjića 45, Niš', NULL, 'ivana.nikolic@example.com', 'zoran.djordjevic@example.com', interval '6 days', interval '3 days', NULL),
  ('Zaglavljena roletna u dnevnoj sobi', 'Roletna je zaglavljena na pola, kaiš ne može ni gore ni dole.',
   'stolarija', 'privatni_stan', 'nisko', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', '10', 'bojan.tasic@example.com', NULL, interval '6 days', NULL, NULL),
  ('Iskače osigurač u kupatilu', 'Kad se uključi bojler, iskače osigurač za kupatilo.',
   'struja', 'privatni_stan', 'srednje', 'resen',
   'Vizantijski bulevar 12, Niš', '8', 'aleksandar.ristic@example.com', 'zoran.djordjevic@example.com', interval '6 days', interval '5 days', NULL),
  ('Buka iz stana iznad', 'Komšije iznad prave buku posle ponoći skoro svake noći.',
   'ostalo', 'zajednicki_prostor', 'nisko', 'odbijen',
   'Bulevar Nemanjića 45, Niš', NULL, 'natalija.stojadinovic@example.com', NULL, interval '8 days', NULL, NULL),
  ('Grafiti na fasadi', 'Na zidu pored ulaza neko je ispisao grafite.',
   'gradjevina', 'zajednicki_prostor', 'nisko', 'odbijen',
   'Vizantijski bulevar 12, Niš', NULL, 'uros.savic@example.com', NULL, interval '9 days', NULL, NULL),
  ('Ogrebotine na vratima lifta', 'Neko je ogrebao unutrašnja vrata lifta.',
   'gradjevina', 'zajednicki_prostor', 'nisko', 'odbijen',
   'Bulevar Nemanjića 45, Niš', NULL, 'dejan.milosavljevic@example.com', NULL, interval '11 days', NULL, NULL),
  ('Začepljen odvod u kadi', 'Voda se sporo odvodi iz kade, verovatno je začepljen sifon.',
   'vodovod', 'privatni_stan', 'nisko', 'zatvoren',
   'Vizantijski bulevar 12, Niš', '16', 'jovana.mitic@example.com', 'dragan.petrovic@example.com', interval '12 days', NULL, NULL),
  ('Kaplje česma u kupatilu', 'Česma na lavabou kaplje i kad je skroz zatvorena.',
   'vodovod', 'privatni_stan', 'nisko', 'zatvoren',
   'Bulevar Nemanjića 45, Niš', '2', 'ana.jovanovic@example.com', 'petar@gmail.com', interval '15 days', NULL, NULL),
  ('Treperi svetlo u hodniku', 'Svetlo u hodniku na trećem spratu treperi.',
   'struja', 'zajednicki_prostor', 'nisko', 'zatvoren',
   'Bulevar Nemanjića 45, Niš', NULL, 'marina.cvetkovic@example.com', 'zoran.djordjevic@example.com', interval '18 days', NULL, NULL),
  ('Hladni radijatori na petom spratu', 'Radijatori u stanovima na petom spratu su jedva mlaki.',
   'grejanje', 'zajednicki_prostor', 'srednje', 'zatvoren',
   'Bulevar Nemanjića 45, Niš', NULL, 'goran.stamenkovic@example.com', 'dragan.petrovic@example.com', interval '30 days', NULL, NULL)
) AS v(naslov, opis, kategorija, lokacija, prioritet, status, adresa, broj, email, serviser, pre, resen, dolazak)
JOIN zgrada z ON z.adresa = v.adresa
LEFT JOIN stan s ON s."zgradaId" = z.id AND s.broj = v.broj AND v.lokacija = 'privatni_stan'
JOIN korisnik k ON k.email = v.email
LEFT JOIN korisnik ser ON ser.email = v.serviser;

INSERT INTO kvar (naslov, opis, kategorija, "lokacijaTip", prioritet, status, "zgradaId", "stanId",
                  "korisnikId", "serviserId", "datumPrijave", "rokResavanja", "datumResenja",
                  "dolazakServisera")
SELECT v.naslov, v.opis, v.kategorija, v.lokacija, v.prioritet, v.status, v.zgrada_id, v.stan_id,
       v.korisnik_id, v.serviser_id, v.datum_prijave, v.rok, v.datum_resenja, v.dolazak
FROM seed_kvar v
WHERE NOT EXISTS (SELECT 1 FROM kvar kv WHERE kv.naslov = v.naslov AND kv."zgradaId" = v.zgrada_id);

-- Kvar iz skripte je najstariji sa tim naslovom u zgradi; isti naslov prijavljen kasnije kroz
-- aplikaciju se ne dira
CREATE TEMP TABLE seed_kvar_id ON COMMIT DROP AS
SELECT min(kv.id) AS id, v.naslov
FROM kvar kv JOIN seed_kvar v ON kv.naslov = v.naslov AND kv."zgradaId" = v.zgrada_id
GROUP BY v.naslov;

UPDATE kvar kv
SET opis = v.opis, kategorija = v.kategorija, "lokacijaTip" = v.lokacija, prioritet = v.prioritet,
    status = v.status, "stanId" = v.stan_id, "korisnikId" = v.korisnik_id, "serviserId" = v.serviser_id,
    "datumPrijave" = v.datum_prijave, "rokResavanja" = v.rok, "datumResenja" = v.datum_resenja,
    "dolazakServisera" = v.dolazak
FROM seed_kvar v JOIN seed_kvar_id si ON si.naslov = v.naslov
WHERE kv.id = si.id;

-- Komentari, istorija i pratioci kvarova iz skripte se pisu iznova (istorija prva, jer pokazuje na komentar)
DELETE FROM promena_statusa_kvara WHERE "kvarId" IN (SELECT id FROM seed_kvar_id);
DELETE FROM komentar_kvar WHERE "kvarId" IN (SELECT id FROM seed_kvar_id);
DELETE FROM pratilac_kvara WHERE "kvarId" IN (SELECT id FROM seed_kvar_id);

-- Kvar u zajednickom prostoru nema stan (kao kad ga prijavi aplikacija); ispravlja i starije redove
UPDATE kvar SET "stanId" = NULL
WHERE "lokacijaTip" = 'zajednicki_prostor' AND "stanId" IS NOT NULL;

-- KOMENTARI NA KVAROVE ----------------------------------------------------------------------
INSERT INTO komentar_kvar (tekst, "kvarId", "korisnikId", "datumKreiranja")
SELECT v.tekst, kv.id, k.id, now() - v.pre
FROM (VALUES
  ('Ne radi grejanje u celoj zgradi', 'danijel@gmail.com', 'Toplana javlja kvar na podstanici, serviser Petar je na licu mesta.', interval '2 hours'),
  ('Ne radi grejanje u celoj zgradi', 'marija@gmail.com', 'I kod nas u stanu 14 je hladno.', interval '1 hour 50 minutes'),
  ('Curi ispod veš mašine', 'petar@gmail.com', 'Dolazim sutra pre podne, do tada zatvorite ventil za mašinu.', interval '4 hours'),
  ('Curi ispod veš mašine', 'natalija.stojadinovic@example.com', 'Može, biću kod kuće.', interval '3 hours'),
  ('Ne radi zvono na vratima stana', 'petar@gmail.com', 'Zamenjeno dugme zvona, sada radi.', interval '1 hour'),
  ('Ne radi svetlo na stepeništu', 'danijel@gmail.com', 'Prihvaćeno, dodeliću električara.', interval '1 day 18 hours'),
  ('Slab mlaz vode u tušu', 'petar@gmail.com', 'Očišćen kamenac sa glave tuša i zamenjen ventil.', interval '1 day 8 hours'),
  ('Slab mlaz vode u tušu', 'marija@gmail.com', 'Posle popravke je mlaz bio dobar jedan dan, sada je opet slab.', interval '3 hours'),
  ('Nema tople vode', 'jovana.mitic@example.com', 'Osigurač bojlera nije iskočio, a lampica na bojleru ne svetli.', interval '4 hours'),
  ('Nema tople vode', 'petar@gmail.com', 'Dolazim danas oko 14h, ponesite ključ od podruma.', interval '3 hours'),
  ('Lift stoji između spratova', 'zoran.djordjevic@example.com', 'Na licu mesta sam, menjam relej upravljanja.', interval '1 hour'),
  ('Pukla cev grejanja u dnevnoj sobi', 'danijel@gmail.com', 'Serviser Dragan dolazi sutra između 9 i 11h.', interval '3 days 20 hours'),
  ('Pukla cev grejanja u dnevnoj sobi', 'stefan.popovic@example.com', 'Hvala, biću kod kuće.', interval '3 days 19 hours'),
  ('Iskače osigurač u kupatilu', 'zoran.djordjevic@example.com', 'Zamenjen neispravan grejač bojlera, sve radi.', interval '5 days')
) AS v(naslov, email, tekst, pre)
JOIN kvar kv ON kv.naslov = v.naslov
JOIN korisnik k ON k.email = v.email
WHERE kv.id IN (SELECT id FROM seed_kvar_id);

-- PRATIOCI KVAROVA --------------------------------------------------------------------------
-- Marijin lift prate tri stanara, Marija prati grejanje, svetlo na stepenistu ima jednog
-- pratioca, ostali nijednog
INSERT INTO pratilac_kvara ("kvarId", "korisnikId", datum)
SELECT kv.id, k.id, now() - v.pre
FROM (VALUES
  ('Ne radi lift', 'natalija.stojadinovic@example.com', interval '1 hour 40 minutes'),
  ('Ne radi lift', 'vesna.djokic@example.com', interval '1 hour 10 minutes'),
  ('Ne radi lift', 'danijel@gmail.com', interval '50 minutes'),
  ('Ne radi grejanje u celoj zgradi', 'marija@gmail.com', interval '1 hour 50 minutes'),
  ('Ne radi grejanje u celoj zgradi', 'ana.jovanovic@example.com', interval '1 hour 30 minutes'),
  ('Ne radi svetlo na stepeništu', 'ana.jovanovic@example.com', interval '1 day 12 hours')
) AS v(naslov, email, pre)
JOIN kvar kv ON kv.naslov = v.naslov
JOIN korisnik k ON k.email = v.email
WHERE kv.id IN (SELECT id FROM seed_kvar_id);

-- ISTORIJA STATUSA KVAROVA ------------------------------------------------------------------
-- Kvar vracen serviseru: posle resenja Marija je javila da nije reseno (razlog je njen komentar),
-- pa je kvar ponovo u toku
INSERT INTO promena_statusa_kvara (status, "kvarId", "korisnikId", "komentarId", datum)
SELECT v.status::promena_statusa_kvara_status_enum, kv.id, k.id, kk.id, now() - v.pre
FROM (VALUES
  ('prijavljen', 'marija@gmail.com', NULL, interval '2 days'),
  ('prihvacen', 'danijel@gmail.com', NULL, interval '1 day 22 hours'),
  ('dodeljen', 'danijel@gmail.com', NULL, interval '1 day 20 hours'),
  ('u_toku', 'petar@gmail.com', NULL, interval '1 day 12 hours'),
  ('resen', 'petar@gmail.com', NULL, interval '1 day 8 hours'),
  ('u_toku', 'marija@gmail.com', 'Posle popravke je mlaz bio dobar jedan dan, sada je opet slab.', interval '3 hours')
) AS v(status, email, razlog, pre)
JOIN kvar kv ON kv.id = (SELECT id FROM seed_kvar_id WHERE naslov = 'Slab mlaz vode u tušu')
JOIN korisnik k ON k.email = v.email
LEFT JOIN komentar_kvar kk ON kk."kvarId" = kv.id AND kk.tekst = v.razlog
WHERE NOT EXISTS (SELECT 1 FROM promena_statusa_kvara p WHERE p."kvarId" = kv.id)
ORDER BY v.pre DESC;

-- Kvar odbijen posle prihvatanja: upravnik je prvo prihvatio, pa video da za antenu nema servisera
INSERT INTO promena_statusa_kvara (status, "kvarId", "korisnikId", datum)
SELECT v.status::promena_statusa_kvara_status_enum, kv.id, k.id, now() - v.pre
FROM (VALUES
  ('prijavljen', 'goran.stamenkovic@example.com', interval '3 days 4 hours'),
  ('prihvacen', 'danijel@gmail.com', interval '3 days'),
  ('odbijen', 'danijel@gmail.com', interval '1 day 2 hours')
) AS v(status, email, pre)
JOIN kvar kv ON kv.id = (SELECT id FROM seed_kvar_id WHERE naslov = 'Nema signala sa zajedničke antene')
JOIN korisnik k ON k.email = v.email
WHERE NOT EXISTS (SELECT 1 FROM promena_statusa_kvara p WHERE p."kvarId" = kv.id)
ORDER BY v.pre DESC;

-- Kvarovi bez istorije (iz ove skripte ili napravljeni pre nego sto je istorija uvedena) dobijaju
-- korake do trenutnog statusa. Datumi su izmisljeni, ali redom: od prijave do resenja (ako postoji),
-- inace do malo pre sadasnjeg trenutka. Ko je promenio: prijavu i potvrdu stanar, rad serviser,
-- ostalo upravnik zgrade.
INSERT INTO promena_statusa_kvara (status, "kvarId", "korisnikId", datum)
SELECT t.korak::promena_statusa_kvara_status_enum, kv.id,
       CASE
         WHEN t.korak IN ('prijavljen', 'zatvoren', 'povucen') THEN kv."korisnikId"
         WHEN t.korak IN ('u_toku', 'resen') THEN kv."serviserId"
         ELSE COALESCE(
           (SELECT u.id FROM korisnik u WHERE u."zgradaId" = kv."zgradaId" AND u.uloga = 'upravnik' LIMIT 1),
           kv."korisnikId")
       END,
       kv."datumPrijave" + CASE t.korak
         WHEN 'prijavljen' THEN 0 WHEN 'prihvacen' THEN 0.1 WHEN 'odbijen' THEN 0.1 WHEN 'povucen' THEN 0.1
         WHEN 'dodeljen' THEN 0.25 WHEN 'u_toku' THEN 0.5 WHEN 'resen' THEN 0.8 ELSE 1
       END * CASE
         WHEN kv."datumResenja" IS NOT NULL THEN (kv."datumResenja" - kv."datumPrijave") / 0.8
         ELSE (now() - kv."datumPrijave") * 0.9
       END
FROM kvar kv
CROSS JOIN LATERAL unnest(
  CASE kv.status::text
    WHEN 'odbijen' THEN ARRAY['prijavljen', 'odbijen']
    WHEN 'povucen' THEN ARRAY['prijavljen', 'povucen']
    ELSE (ARRAY['prijavljen', 'prihvacen', 'dodeljen', 'u_toku', 'resen', 'zatvoren'])
         [1:array_position(ARRAY['prijavljen', 'prihvacen', 'dodeljen', 'u_toku', 'resen', 'zatvoren'],
                           kv.status::text)]
  END
) WITH ORDINALITY AS t(korak, redni)
WHERE NOT EXISTS (SELECT 1 FROM promena_statusa_kvara p WHERE p."kvarId" = kv.id)
ORDER BY kv.id, t.redni;

-- RAZLOZI ODBIJANJA I POVLACENJA: komentar onoga ko je odbio ili povukao, upisan u istom trenutku
-- i vezan za tu promenu statusa (kao kad akcija ide kroz aplikaciju)
WITH razlog AS (
  SELECT si.id AS kvar_id, v.tekst
  FROM (VALUES
    ('Napukla pločica u kupatilu', 'Pločice u stanu održava vlasnik stana, to nije posao upravnika zgrade.'),
    ('Buka iz stana iznad', 'Ovo nije kvar u zgradi; razgovaraću sa komšijama na sledećem sastanku stanara.'),
    ('Grafiti na fasadi', 'Krečenje fasade je u planu za proleće, tada će se i grafiti prekrečiti.'),
    ('Ogrebotine na vratima lifta', 'Ogrebotine ne utiču na rad lifta, popraviće se pri redovnom servisu.'),
    ('Nema signala sa zajedničke antene', 'Za antenu nemamo servisera. Dogovor o novoj anteni ide na sastanak stanara.'),
    ('Zaglavljuje se brava na vratima stana', 'Podmazali smo bravu i sada radi.')
  ) AS v(naslov, tekst)
  JOIN seed_kvar_id si ON si.naslov = v.naslov
), promena AS (
  SELECT DISTINCT ON (p."kvarId") p.id, p."kvarId", p."korisnikId", p.datum
  FROM promena_statusa_kvara p JOIN razlog r ON r.kvar_id = p."kvarId"
  WHERE p.status IN ('odbijen', 'povucen')
  ORDER BY p."kvarId", p.datum DESC
), komentar AS (
  INSERT INTO komentar_kvar (tekst, "kvarId", "korisnikId", "datumKreiranja")
  SELECT r.tekst, r.kvar_id, p."korisnikId", p.datum
  FROM razlog r JOIN promena p ON p."kvarId" = r.kvar_id
  RETURNING id, "kvarId"
)
UPDATE promena_statusa_kvara p SET "komentarId" = k.id
FROM komentar k JOIN promena pr ON pr."kvarId" = k."kvarId"
WHERE p.id = pr.id;

-- OGLASI ------------------------------------------------------------------------------------
-- Oglasi iz skripte se pri svakom pokretanju vracaju na pocetno stanje: datumi se racunaju od
-- sadasnjeg trenutka, a izmena i sakrivanje se pisu iznova. Oglasi iz aplikacije se ne diraju.
-- Glavni nalozi (Delta Residence, 11 oglasa: ko vidi i sakriven, ima dve strane po 10):
--   Marija: radovi (izmenjen), nadjeni kljucevi (istekli, dugme Obnovi) i reklama koju je
--     Danijel sakrio (vidi razlog); ne vidi isteklu Ivaninu prodaju bicikla
--   Danijel (upravnik): dva obavestenja (iskljucenje vode je vazno); sakriva tudje oglase,
--     vidi i sakriven Marijin i istekle oglase
--   Marko (admin): obavestenje u Delti; vidi oglase sve tri zgrade i filter po zgradi
--   Petar (serviser) nema oglasnu tablu
-- Obavestenja su na vrhu liste; vazni su iskljucenje vode i upozorenje za ulazna vrata.
-- vazi = koliko jos vazi od sadasnjeg trenutka (negativno = istekao, NULL = ne istice)
CREATE TEMP TABLE seed_oglas ON COMMIT DROP AS
SELECT v.naslov, v.tekst, v.vrsta::oglas_vrsta_enum AS vrsta, z.id AS zgrada_id, k.id AS autor_id,
       now() - v.pre AS datum_kreiranja, now() - v.izmenjen AS datum_izmene,
       now() - v.sakriven AS datum_sakrivanja, v.razlog, v.vazno, now() + v.vazi AS vazi_do
FROM (VALUES
  ('Isključenje vode u četvrtak',
   E'U četvrtak od 9 do 13 h neće biti vode zbog zamene glavnog ventila u podrumu.\nNapunite flaše na vreme.',
   'obavestenje', 'Bulevar Nemanjića 45, Niš', 'danijel@gmail.com',
   interval '2 hours', NULL::interval, NULL::interval, NULL, true, interval '3 days'),
  ('Bušenje u stanu 14 u subotu',
   'U subotu od 10 do 12 h bušim zid u kupatilu. Izvinjavam se zbog buke.',
   'radovi', 'Bulevar Nemanjića 45, Niš', 'marija@gmail.com',
   interval '5 hours', interval '3 hours', NULL, NULL, false, interval '4 days'),
  ('Ulazna vrata ostavljena otvorena noću',
   'Već dve noći su ulazna vrata ostala otvorena posle ponoći. Molim sve da ih zatvore za sobom.',
   'upozorenje', 'Bulevar Nemanjića 45, Niš', 'stefan.popovic@example.com',
   interval '1 day', NULL, NULL, NULL, true, NULL::interval),
  ('Poklanjam dečja kolica',
   'Kolica su očuvana, sklapaju se. Javite se u stan 1 posle 17 h.',
   'prodaja', 'Bulevar Nemanjića 45, Niš', 'vesna.djokic@example.com',
   interval '2 days', NULL, NULL, NULL, false, interval '28 days'),
  ('Obaveštenja zgrade su sada u aplikaciji',
   E'Obaveštenja upravnika i poruke komšijama od sada su na oglasnoj tabli u aplikaciji.\nKvarove i dalje prijavljujte u Kvarovima.',
   'obavestenje', 'Bulevar Nemanjića 45, Niš', 'marko@gmail.com',
   interval '3 days', NULL, NULL, NULL, false, NULL),
  ('Tražim čuvanje mačke za vikend',
   'Od petka do nedelje nisam u gradu. Treba svratiti jednom dnevno, sipati hranu i vodu.',
   'trazim', 'Bulevar Nemanjića 45, Niš', 'natalija.stojadinovic@example.com',
   interval '4 days', NULL, NULL, NULL, false, interval '26 days'),
  ('Nađeni ključevi u liftu',
   'U liftu su nađeni ključevi sa plavim privezkom. Kod mene su, stan 14.',
   'izgubljeno', 'Bulevar Nemanjića 45, Niš', 'marija@gmail.com',
   interval '5 days', NULL, NULL, NULL, false, interval '-1 day'),
  ('Sastanak stanara sledeće srede u 19 h',
   'Teme: krečenje stepeništa i nova antena. Sastanak je u prostoriji pored podruma.',
   'obavestenje', 'Bulevar Nemanjića 45, Niš', 'danijel@gmail.com',
   interval '6 days', NULL, NULL, NULL, false, interval '7 days'),
  ('Selidba u petak, lift zauzet',
   'U petak od 8 do 11 h selidba iz stana 18. Lift će povremeno biti zauzet.',
   'radovi', 'Bulevar Nemanjića 45, Niš', 'goran.stamenkovic@example.com',
   interval '8 days', NULL, NULL, NULL, false, NULL),
  ('Kozmetički salon - popust 20% za komšije',
   'Otvorila sam salon u centru. Uz ovaj oglas komšije imaju popust 20% na sve usluge.',
   'ostalo', 'Bulevar Nemanjića 45, Niš', 'marija@gmail.com',
   interval '9 days', NULL, interval '8 days',
   'Oglasna tabla je za komšije i zgradu, ne za reklamu firmi.', false, NULL),
  ('Prodajem bicikl',
   'Muški bicikl, 26 inča, sa korpom. Cena po dogovoru, stan 5.',
   'prodaja', 'Bulevar Nemanjića 45, Niš', 'ivana.nikolic@example.com',
   interval '12 days', NULL, NULL, NULL, false, interval '-2 days'),
  -- Ostale zgrade: Marko ih vidi uz filter po zgradi
  ('Čišćenje podruma u subotu',
   'U subotu od 9 h čistimo podrum. Stvari koje nisu označene imenom biće bačene.',
   'obavestenje', 'Obrenovićeva 30, Niš', 'jelena.markovic@example.com',
   interval '1 day', NULL, NULL, NULL, false, interval '2 days'),
  ('Servis lifta u ponedeljak',
   'U ponedeljak od 8 do 12 h lift ne radi zbog redovnog servisa.',
   'obavestenje', 'Vizantijski bulevar 12, Niš', 'nikola.ilic@example.com',
   interval '2 days', NULL, NULL, NULL, false, NULL)
) AS v(naslov, tekst, vrsta, adresa, email, pre, izmenjen, sakriven, razlog, vazno, vazi)
JOIN zgrada z ON z.adresa = v.adresa
JOIN korisnik k ON k.email = v.email;

INSERT INTO oglas (naslov, tekst, vrsta, "zgradaId", "autorId")
SELECT v.naslov, v.tekst, v.vrsta, v.zgrada_id, v.autor_id
FROM seed_oglas v
WHERE NOT EXISTS (SELECT 1 FROM oglas o WHERE o.naslov = v.naslov AND o."zgradaId" = v.zgrada_id);

-- Oglas iz skripte je najstariji sa tim naslovom u zgradi; isti naslov objavljen kasnije se ne dira
UPDATE oglas o
SET tekst = v.tekst, vrsta = v.vrsta, "autorId" = v.autor_id, "datumKreiranja" = v.datum_kreiranja,
    "datumIzmene" = v.datum_izmene, "datumSakrivanja" = v.datum_sakrivanja,
    "razlogSakrivanja" = v.razlog, vazno = v.vazno, "vaziDo" = v.vazi_do
FROM seed_oglas v
WHERE o.id = (SELECT min(o2.id) FROM oglas o2
              WHERE o2.naslov = v.naslov AND o2."zgradaId" = v.zgrada_id);

-- GLASANJE (ANKETE) -------------------------------------------------------------------------
-- Ankete iz skripte se pri svakom pokretanju brisu i prave iznova, zajedno sa opcijama i
-- glasovima, pa rokovi uvek vaze od danas. Ankete iz aplikacije (drugo pitanje) se ne diraju.
-- Glavni nalozi (Delta Residence, 13 stanara sa pravom glasa):
--   Marija: boja ulaza (nije glasala, ne vidi rezultate), ciscenje podruma (glasala, istice
--     sutra: menja ili povlaci glas), kamera na ulazu (istice danas); u Zavrsenim klupa
--     (njen glas Da je vodeci) i kabasti otpad (Danijel zatvorio ranije)
--   Danijel (upravnik i stanar): vidi rezultate odmah, glasa, zatvara i brise ankete
--   Marko (admin): ankete sve tri zgrade i filter po zgradi; ne glasa jer nema stan
--   Nikola (upravnik Lamele bez stana): vidi rezultate, ne glasa
--   Petar (serviser) nema glasanje
-- dana = rok je kraj dana toliko dana od danas (negativno = zavrsena);
-- ranije = upravnik je zatvorio anketu pre toliko vremena (rok se tada pomera na taj trenutak)
CREATE TEMP TABLE seed_anketa ON COMMIT DROP AS
SELECT v.rb, v.pitanje, v.opis, z.id AS zgrada_id, k.id AS kreirao_id,
       now() - v.pre AS datum_kreiranja,
       CASE WHEN v.ranije IS NOT NULL THEN now() - v.ranije
            ELSE (date_trunc('day', now() AT TIME ZONE 'Europe/Belgrade')
                  + (v.dana + 1) * interval '1 day' - interval '1 millisecond')
                 AT TIME ZONE 'Europe/Belgrade'
       END AS rok,
       v.ranije IS NOT NULL AS zatvoreno_ranije
FROM (VALUES
  (1, 'Koju boju da izaberemo za zidove ulaza?',
   'Krečenje ulaza je planirano za jun. Izvođač nudi tri boje po istoj ceni.',
   'Bulevar Nemanjića 45, Niš', 'danijel@gmail.com', interval '2 days', 5, NULL::interval),
  (2, 'Kada da organizujemo generalno čišćenje podruma?', NULL,
   'Bulevar Nemanjića 45, Niš', 'danijel@gmail.com', interval '4 days', 1, NULL),
  (3, 'Da li ste za postavljanje kamere na ulazu?',
   E'Kamera bi snimala samo ulazna vrata i poštanske sandučiće.\nSnimci se čuvaju 7 dana.',
   'Bulevar Nemanjića 45, Niš', 'danijel@gmail.com', interval '6 days', 0, NULL),
  (4, 'Da li da postavimo klupu ispred ulaza?', NULL,
   'Bulevar Nemanjića 45, Niš', 'danijel@gmail.com', interval '12 days', -3, NULL),
  (5, 'Novi termin odnošenja kabastog otpada', 'Komunalno preduzeće nudi dva termina mesečno.',
   'Bulevar Nemanjića 45, Niš', 'marko@gmail.com', interval '9 days', NULL, interval '1 day'),
  -- Ostale zgrade: Marko ih vidi uz filter po zgradi
  (6, 'Da li da zamenimo sijalice na stepeništu LED sijalicama?', NULL,
   'Obrenovićeva 30, Niš', 'jelena.markovic@example.com', interval '1 day', 6, NULL),
  (7, 'Treba li nam dodatni stalak za bicikle?', NULL,
   'Vizantijski bulevar 12, Niš', 'nikola.ilic@example.com', interval '3 days', 4, NULL)
) AS v(rb, pitanje, opis, adresa, email, pre, dana, ranije)
JOIN zgrada z ON z.adresa = v.adresa
JOIN korisnik k ON k.email = v.email;

CREATE TEMP TABLE seed_opcija (anketa int, rb int, tekst text) ON COMMIT DROP;
INSERT INTO seed_opcija VALUES
  (1, 1, 'Bela'), (1, 2, 'Svetlo siva'), (1, 3, 'Bež'),
  (2, 1, 'Subota prepodne'), (2, 2, 'Subota popodne'), (2, 3, 'Nedelja prepodne'),
  (3, 1, 'Da'), (3, 2, 'Ne'),
  (4, 1, 'Da'), (4, 2, 'Ne'), (4, 3, 'Svejedno mi je'),
  (5, 1, 'Prva subota u mesecu'), (5, 2, 'Poslednja subota u mesecu'),
  (6, 1, 'Da'), (6, 2, 'Ne'),
  (7, 1, 'Da, pored ulaza'), (7, 2, 'Da, u podrumu'), (7, 3, 'Ne treba');

CREATE TEMP TABLE seed_glas (anketa int, email text, opcija text) ON COMMIT DROP;
INSERT INTO seed_glas VALUES
  (1, 'vesna.djokic@example.com', 'Svetlo siva'), (1, 'ana.jovanovic@example.com', 'Bela'),
  (1, 'milan.stojkovic@example.com', 'Svetlo siva'), (1, 'ivana.nikolic@example.com', 'Svetlo siva'),
  (1, 'dejan.milosavljevic@example.com', 'Bež'), (1, 'sanja.milosavljevic@example.com', 'Svetlo siva'),
  (1, 'bojan.tasic@example.com', 'Bela'), (1, 'stefan.popovic@example.com', 'Svetlo siva'),
  (2, 'marija@gmail.com', 'Subota popodne'), (2, 'vesna.djokic@example.com', 'Subota prepodne'),
  (2, 'marina.cvetkovic@example.com', 'Subota popodne'), (2, 'goran.stamenkovic@example.com', 'Nedelja prepodne'),
  (3, 'danijel@gmail.com', 'Da'), (3, 'stefan.popovic@example.com', 'Da'),
  (4, 'marija@gmail.com', 'Da'), (4, 'natalija.stojadinovic@example.com', 'Da'),
  (4, 'vesna.djokic@example.com', 'Da'), (4, 'ana.jovanovic@example.com', 'Ne'),
  (4, 'milan.stojkovic@example.com', 'Da'), (4, 'bojan.tasic@example.com', 'Svejedno mi je'),
  (4, 'marina.cvetkovic@example.com', 'Da'), (4, 'goran.stamenkovic@example.com', 'Ne'),
  (5, 'marija@gmail.com', 'Poslednja subota u mesecu'), (5, 'danijel@gmail.com', 'Prva subota u mesecu'),
  (5, 'ivana.nikolic@example.com', 'Poslednja subota u mesecu'),
  (6, 'milica.djordjevic@example.com', 'Da'), (6, 'nemanja.kostic@example.com', 'Da'),
  (6, 'tijana.pavlovic@example.com', 'Ne'),
  (7, 'jovana.mitic@example.com', 'Da, u podrumu');

DELETE FROM glasanje g
USING seed_anketa s
WHERE g.pitanje = s.pitanje AND g."zgradaId" = s.zgrada_id;

INSERT INTO glasanje (vrsta, pitanje, opis, rok, "zatvorenoRanije", "zgradaId", "kreiraoId", "datumKreiranja")
SELECT 'anketa', s.pitanje, s.opis, s.rok, s.zatvoreno_ranije, s.zgrada_id, s.kreirao_id, s.datum_kreiranja
FROM seed_anketa s
ORDER BY s.rb;

-- Redosled opcija u aplikaciji je redosled id-jeva
INSERT INTO opcija_glasanja (tekst, "glasanjeId")
SELECT o.tekst, g.id
FROM seed_opcija o
JOIN seed_anketa s ON s.rb = o.anketa
JOIN glasanje g ON g.pitanje = s.pitanje AND g."zgradaId" = s.zgrada_id
ORDER BY o.anketa, o.rb;

-- Glas je dat pre roka (za zavrsene ankete) i posle pravljenja ankete
INSERT INTO glas ("glasanjeId", "opcijaId", "korisnikId", "datumGlasanja")
SELECT g.id, o.id, k.id, s.datum_kreiranja + (least(now(), s.rok) - s.datum_kreiranja) / 2
FROM seed_glas sg
JOIN seed_anketa s ON s.rb = sg.anketa
JOIN glasanje g ON g.pitanje = s.pitanje AND g."zgradaId" = s.zgrada_id
JOIN opcija_glasanja o ON o."glasanjeId" = g.id AND o.tekst = sg.opcija
JOIN korisnik k ON k.email = sg.email;

COMMIT;
