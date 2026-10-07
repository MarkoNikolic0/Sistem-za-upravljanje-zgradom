-- Test podaci za razvoj i demonstraciju: tri zgrade u Nisu, stanovi, upravnici, serviseri,
-- stanari, zahtevi za povezivanje i kvarovi u razlicitim statusima.
--
-- Pokretanje (iz foldera backend, dok radi Docker kontejner):
--   docker exec -i zgrada_container sh -c 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB"' < seed/seed.sql
--
-- Svi test nalozi imaju lozinku: Zgrada123!
-- Izuzetak: prvi nalozi napravljeni rucno (marko@, marija@, danijel@, petar@gmail.com) zadrzavaju
-- lozinku koju vec imaju u bazi; Zgrada123! dobijaju samo ako ih skripta pravi u praznoj bazi.
-- Email adrese novih naloga su na domenu example.com (rezervisan za primere, RFC 2606).
-- Skripta se moze pokrenuti vise puta: postojeci podaci (isti email, zgrada, stan) se preskacu.

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
  ('petar@gmail.com', 'vodovod'),
  ('petar@gmail.com', 'grejanje'),
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
  ('jelena.markovic@example.com', 'Obrenovićeva 30, Niš', '13', true)
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

-- KVAROVI (svi statusi) ---------------------------------------------------------------------
INSERT INTO kvar (naslov, opis, kategorija, "lokacijaTip", prioritet, status,
                  "zgradaId", "stanId", "korisnikId", "serviserId", "datumPrijave")
SELECT v.naslov, v.opis,
       v.kategorija::kvar_kategorija_enum, v.lokacija::kvar_lokacijatip_enum,
       v.prioritet::kvar_prioritet_enum, v.status::kvar_status_enum,
       z.id, s.id, k.id, ser.id, now() - v.pre
FROM (VALUES
  -- prvi kvarovi (napravljeni rucno); lift je u zajednickom prostoru, bez stana
  ('Curi slavina', 'Slavina u kupatilu curi neprestano',
   'vodovod', 'privatni_stan', 'srednje', 'zatvoren',
   'Bulevar Nemanjića 45, Niš', '14', 'marija@gmail.com', 'petar@gmail.com', interval '20 days'),
  ('Ne radi lift', 'Lift zaglavljen između spratova',
   'lift', 'zajednicki_prostor', 'srednje', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', NULL, 'marija@gmail.com', NULL, interval '4 days'),
  ('Ne radi interfon', 'Interfon ne zvoni u stanovima na trećem spratu, ne može da se otvori ulaz.',
   'struja', 'zajednicki_prostor', 'srednje', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', '10', 'bojan.tasic@example.com', NULL, interval '8 hours'),
  ('Vlaga na zidu u spavaćoj sobi', 'Na zidu prema fasadi se pojavila vlaga i buđ, širi se posle kiše.',
   'gradjevina', 'privatni_stan', 'srednje', 'prihvacen',
   'Bulevar Nemanjića 45, Niš', '12', 'marina.cvetkovic@example.com', NULL, interval '3 days'),
  ('Curenje vode ispod sudopere', 'Od jutros curi voda ispod sudopere, ispod je mokar ormarić. Zatvorio sam ventil.',
   'vodovod', 'privatni_stan', 'srednje', 'prijavljen',
   'Bulevar Nemanjića 45, Niš', '2', 'ana.jovanovic@example.com', NULL, interval '3 hours'),
  ('Ne radi svetlo na stepeništu', 'Na trećem spratu ne radi svetlo već dva dana, mrak je uveče.',
   'struja', 'zajednicki_prostor', 'srednje', 'prihvacen',
   'Bulevar Nemanjića 45, Niš', '5', 'milan.stojkovic@example.com', NULL, interval '2 days'),
  ('Pukla cev grejanja u dnevnoj sobi', 'Iz radijatora u dnevnoj sobi kaplje voda, ispod je bara.',
   'grejanje', 'privatni_stan', 'hitno', 'dodeljen',
   'Bulevar Nemanjića 45, Niš', '15', 'stefan.popovic@example.com', 'dragan.petrovic@example.com', interval '1 day'),
  ('Lift stoji između spratova', 'Lift se zaustavio između drugog i trećeg sprata, ne reaguje na dugmad.',
   'lift', 'zajednicki_prostor', 'hitno', 'u_toku',
   'Obrenovićeva 30, Niš', '4', 'milica.djordjevic@example.com', 'zoran.djordjevic@example.com', interval '5 hours'),
  ('Ne zatvaraju se ulazna vrata zgrade', 'Brava na ulaznim vratima ne hvata, vrata ostaju otvorena.',
   'stolarija', 'zajednicki_prostor', 'srednje', 'prijavljen',
   'Obrenovićeva 30, Niš', '7', 'nemanja.kostic@example.com', NULL, interval '6 hours'),
  ('Iskače osigurač u kupatilu', 'Kad se uključi bojler, iskače osigurač za kupatilo.',
   'struja', 'privatni_stan', 'srednje', 'resen',
   'Vizantijski bulevar 12, Niš', '8', 'aleksandar.ristic@example.com', 'zoran.djordjevic@example.com', interval '6 days'),
  ('Začepljen odvod u kadi', 'Voda se sporo odvodi iz kade, verovatno je začepljen sifon.',
   'vodovod', 'privatni_stan', 'nisko', 'zatvoren',
   'Vizantijski bulevar 12, Niš', '16', 'jovana.mitic@example.com', 'dragan.petrovic@example.com', interval '12 days'),
  ('Grafiti na fasadi', 'Na zidu pored ulaza neko je ispisao grafite.',
   'gradjevina', 'zajednicki_prostor', 'nisko', 'odbijen',
   'Vizantijski bulevar 12, Niš', '22', 'uros.savic@example.com', NULL, interval '9 days')
) AS v(naslov, opis, kategorija, lokacija, prioritet, status, adresa, broj, email, serviser, pre)
JOIN zgrada z ON z.adresa = v.adresa
LEFT JOIN stan s ON s."zgradaId" = z.id AND s.broj = v.broj
JOIN korisnik k ON k.email = v.email
LEFT JOIN korisnik ser ON ser.email = v.serviser
WHERE NOT EXISTS (SELECT 1 FROM kvar kv WHERE kv.naslov = v.naslov AND kv."zgradaId" = z.id);

-- KOMENTARI NA KVAROVE ----------------------------------------------------------------------
INSERT INTO komentar_kvar (tekst, "kvarId", "korisnikId", "datumKreiranja")
SELECT v.tekst, kv.id, k.id, now() - v.pre
FROM (VALUES
  ('Pukla cev grejanja u dnevnoj sobi', 'danijel@gmail.com', 'Serviser Dragan dolazi sutra između 9 i 11h.', interval '20 hours'),
  ('Pukla cev grejanja u dnevnoj sobi', 'stefan.popovic@example.com', 'Hvala, biću kod kuće.', interval '19 hours'),
  ('Lift stoji između spratova', 'zoran.djordjevic@example.com', 'Na licu mesta sam, menjam relej upravljanja.', interval '1 hour'),
  ('Iskače osigurač u kupatilu', 'zoran.djordjevic@example.com', 'Zamenjen neispravan grejač bojlera, sve radi.', interval '5 days'),
  ('Ne radi svetlo na stepeništu', 'danijel@gmail.com', 'Prihvaćeno, dodeliću električara.', interval '1 day')
) AS v(naslov, email, tekst, pre)
JOIN kvar kv ON kv.naslov = v.naslov
JOIN korisnik k ON k.email = v.email
WHERE NOT EXISTS (
  SELECT 1 FROM komentar_kvar kk WHERE kk."kvarId" = kv.id AND kk.tekst = v.tekst
);

COMMIT;
