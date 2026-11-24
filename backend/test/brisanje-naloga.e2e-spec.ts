import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { Logger } from '@nestjs/common';
import { io, type Socket } from 'socket.io-client';
import request from 'supertest';
import { Glas } from '../src/glasanje/glas.entity.js';
import { Korisnik } from '../src/korisnik/korisnik.entity.js';
import { KomentarKvar } from '../src/komentar-kvar/komentar-kvar.entity.js';
import { Notifikacija } from '../src/notifikacija/notifikacija.entity.js';
import { Oglas } from '../src/oglas/oglas.entity.js';
import { PrilogOglasa } from '../src/oglas/prilog-oglasa.entity.js';
import { PratilacKvara } from '../src/pratilac-kvara/pratilac-kvara.entity.js';
import { StanarStana } from '../src/stanar-stana/stanar-stana.entity.js';
import { Zgrada } from '../src/zgrada/zgrada.entity.js';
import { Uloga } from '../src/shared/enums/uloga.enum.js';
import { LokacijaTip } from '../src/shared/enums/kvar.enums.js';
import {
  type Akter,
  kao,
  pokreniAplikaciju,
  type TestAplikacija,
} from './pomoc/aplikacija.js';
import {
  kolacicSesije,
  LOZINKA,
  napraviKorisnika,
  napraviSadrzaj,
  napraviServisera,
  napraviZgraduSaLjudima,
  noviKvar,
  prijavi,
  type Svet,
} from './pomoc/podaci.js';

describe('brisanje naloga', () => {
  let t: TestAplikacija;
  let admin: Akter;

  const korisnik = (id: number) =>
    t.baza.getRepository(Korisnik).findOneByOrFail({ id });

  const obrisiSvoj = (akter: Akter, lozinka = LOZINKA) =>
    kao(t, akter).post('/korisnik/moj-profil/brisanje').send({ lozinka });

  const napraviSvet = async (naziv: string): Promise<Svet> => ({
    a: await napraviZgraduSaLjudima(t, naziv),
    b: await napraviZgraduSaLjudima(t, `${naziv}B`),
    admin,
    serviser: await napraviServisera(t, `Serviser${naziv}`),
    bezStana: await napraviKorisnika(t, `Novajlija${naziv}`),
  });

  beforeAll(async () => {
    t = await pokreniAplikaciju();
    admin = await napraviKorisnika(t, 'Admin', { uloga: Uloga.ADMIN });
  });

  afterAll(async () => {
    await t?.app.close();
  });

  describe('korisnik briše svoj nalog', () => {
    it('uz ispravnu lozinku nalog postaje anoniman, sesija se gasi i stiže mejl', async () => {
      const stanar = await napraviKorisnika(t, 'Brisac');
      const { token, kolacic } = await prijavi(t, stanar.email);

      const odgovor = await kao(t, { ...stanar, token })
        .post('/korisnik/moj-profil/brisanje')
        .set('Cookie', kolacic)
        .send({ lozinka: LOZINKA })
        .expect(204);

      expect(odgovor.get('Set-Cookie')?.join(';')).toMatch(
        /refresh_token=;.*Path=\/auth/,
      );
      const nalog = await korisnik(stanar.id);
      expect(nalog).toMatchObject({
        ime: 'Bivši',
        prezime: 'korisnik',
        email: `obrisan-${stanar.id}@obrisan.invalid`,
        telefon: '',
      });
      expect(nalog.obrisan).toBeInstanceOf(Date);
      expect(nalog.deaktiviran).toBeInstanceOf(Date);

      await kao(t, { ...stanar, token })
        .get('/korisnik/moj-profil')
        .expect(401);
      await request(t.server)
        .post('/auth/refresh')
        .set('Cookie', kolacic)
        .expect(401);
      await request(t.server)
        .post('/auth/login')
        .send({ email: stanar.email, lozinka: LOZINKA })
        .expect(401);
      await t.posta.sacekaj(stanar.email, 'Nalog je obrisan');
    });

    it('pogrešna lozinka ne briše nalog i vraća grešku polja', async () => {
      const stanar = await napraviKorisnika(t, 'Pogresni');

      const odgovor = await obrisiSvoj(stanar, 'PogresnaLozinka1!').expect(400);

      expect(odgovor.body.greske).toEqual({
        lozinka: 'Lozinka nije ispravna.',
      });
      expect((await korisnik(stanar.id)).obrisan).toBeNull();
      await kao(t, stanar).get('/korisnik/moj-profil').expect(200);
    });

    it('bez lozinke vraća 400', async () => {
      const stanar = await napraviKorisnika(t, 'BezLozinke');
      await kao(t, stanar)
        .post('/korisnik/moj-profil/brisanje')
        .send({})
        .expect(400);
      expect((await korisnik(stanar.id)).obrisan).toBeNull();
    });

    it('lični oglasi se brišu sa prilozima, komentari i kvarovi ostaju bez imena, a glas u anketi koja traje se povlači kao pri odseljenju', async () => {
      const svet = await napraviSvet('Anonim');
      const sadrzaj = await napraviSadrzaj(t, svet, svet.a);
      const { vlasnik, upravnik } = svet.a;
      const prilog = await t.baza
        .getRepository(PrilogOglasa)
        .findOneByOrFail({ id: sadrzaj.prilog });
      await kao(t, vlasnik)
        .put(`/glasanje/${sadrzaj.anketa}/glas`)
        .send({ opcijaId: sadrzaj.opcijaAnkete })
        .expect(200);
      const tudjKvar = await kao(t, svet.a.sused)
        .post('/kvar')
        .send(noviKvar(svet.a.stanovi[1], LokacijaTip.ZAJEDNICKI_PROSTOR))
        .expect(201);
      await kao(t, vlasnik)
        .put(`/kvar/${tudjKvar.body.id}/pracenje`)
        .expect(200);

      await obrisiSvoj(vlasnik).expect(204);

      expect(
        await t.baza.getRepository(Oglas).existsBy({ id: sadrzaj.oglas }),
      ).toBe(false);
      expect(t.skladiste.fajlovi.has(prilog.kljuc)).toBe(false);
      expect(
        await t.baza.getRepository(Oglas).existsBy({ id: sadrzaj.obavestenje }),
      ).toBe(true);
      expect(
        await t.baza
          .getRepository(StanarStana)
          .existsBy({ korisnik: { id: vlasnik.id } }),
      ).toBe(false);
      expect(
        await t.baza
          .getRepository(Notifikacija)
          .existsBy({ korisnik: { id: vlasnik.id } }),
      ).toBe(false);
      expect(
        await t.baza
          .getRepository(PratilacKvara)
          .existsBy({ korisnik: { id: vlasnik.id } }),
      ).toBe(false);

      const komentari = await kao(t, upravnik)
        .get(`/kvar/${sadrzaj.kvarZajednicki}/komentar`)
        .expect(200);
      const komentar = (komentari.body.stavke ?? komentari.body).find(
        (k: { id: number }) => k.id === sadrzaj.komentar,
      );
      expect(komentar.korisnik).toMatchObject({
        ime: 'Bivši',
        prezime: 'korisnik',
      });
      expect(
        await t.baza
          .getRepository(KomentarKvar)
          .existsBy({ id: sadrzaj.komentar }),
      ).toBe(true);

      const kvar = await kao(t, upravnik)
        .get(`/kvar/${sadrzaj.kvarZajednicki}`)
        .expect(200);
      expect(kvar.body.korisnik).toMatchObject({
        ime: 'Bivši',
        prezime: 'korisnik',
      });
      expect(kvar.body.korisnik.email).toBeUndefined();
      expect(kvar.body.korisnik.telefon).toBeUndefined();

      expect(
        await t.baza
          .getRepository(Glas)
          .countBy({ glasanje: { id: sadrzaj.anketa } }),
      ).toBe(0);
    });

    it('upravnik koji obriše nalog više ne upravlja zgradom', async () => {
      const svet = await napraviSvet('Odlazak');

      await obrisiSvoj(svet.a.upravnik).expect(204);

      const zgrada = await t.baza
        .getRepository(Zgrada)
        .findOneByOrFail({ id: svet.a.id });
      expect(zgrada.upravnikId).toBeNull();
    });

    it('administrator ne može da obriše svoj nalog', async () => {
      const odgovor = await obrisiSvoj(admin).expect(403);
      expect(odgovor.body.message).toBe(
        'Nalog administratora ne može da se obriše.',
      );
      expect((await korisnik(admin.id)).obrisan).toBeNull();
    });

    it('ista adresa posle brisanja može ponovo da se registruje', async () => {
      const stanar = await napraviKorisnika(t, 'Povratnik');
      await obrisiSvoj(stanar).expect(204);

      await request(t.server)
        .post('/auth/register')
        .send({
          ime: 'Jovana',
          prezime: 'Ilić',
          email: stanar.email,
          telefon: '0641234567',
          lozinka: LOZINKA,
        })
        .expect(202);
      await t.posta.sacekaj(stanar.email, 'Aktivacija naloga');
    });

    it('brisanje se beleži u log bez emaila', async () => {
      const zapisi = vi.spyOn(Logger.prototype, 'log');
      try {
        const stanar = await napraviKorisnika(t, 'Zabelezeni');
        await obrisiSvoj(stanar).expect(204);
        const log = zapisi.mock.calls.flat().map(String).join('\n');
        expect(log).toContain(`Nalog ${stanar.id} je obrisao svoj nalog.`);
        expect(log).not.toContain(stanar.email);
      } finally {
        zapisi.mockRestore();
      }
    });
  });

  it('brisanje prekida veze ostalih uređaja, a uređaj na kom se briše zatvara svoju sam', async () => {
    const stanar = await napraviKorisnika(t, 'DvaUredjaja');
    const telefon = await prijavi(t, stanar.email);
    const racunar = await prijavi(t, stanar.email);
    const adresa = `http://localhost:${((t.server as Server).address() as AddressInfo).port}/notifikacije`;
    const povezi = (token: string) =>
      new Promise<Socket>((uspeh, neuspeh) => {
        const socket = io(adresa, {
          auth: { token },
          transports: ['websocket'],
          reconnection: false,
          forceNew: true,
        });
        socket.once('connect', () => uspeh(socket));
        socket.once('connect_error', neuspeh);
      });
    const naTelefonu = await povezi(telefon.token);
    const naRacunaru = await povezi(racunar.token);
    try {
      const prekidRacunara = new Promise<string>((kraj) =>
        naRacunaru.once('disconnect', kraj),
      );

      await kao(t, { ...stanar, token: telefon.token })
        .post('/korisnik/moj-profil/brisanje')
        .send({ lozinka: LOZINKA })
        .expect(204);

      expect(await prekidRacunara).toBe('io server disconnect');
      await new Promise((kraj) => setTimeout(kraj, 300));
      expect(naTelefonu.connected).toBe(true);
    } finally {
      naTelefonu.close();
      naRacunaru.close();
    }
  });

  describe('admin briše nalog', () => {
    it('aktivan nalog se ne briše dok se ne deaktivira', async () => {
      const stanar = await napraviKorisnika(t, 'Aktivni');

      const odgovor = await kao(t, admin)
        .delete(`/korisnik/${stanar.id}`)
        .expect(409);
      expect(odgovor.body.message).toBe(
        'Briše se samo deaktiviran nalog. Prvo ga deaktiviraj.',
      );
      expect((await korisnik(stanar.id)).obrisan).toBeNull();
    });

    it('deaktiviran nalog se anonimizuje, ne može ponovo da se aktivira i nestaje sa spiska', async () => {
      const stanar = await napraviKorisnika(t, 'Deaktivirani');
      await kao(t, admin)
        .put(`/korisnik/${stanar.id}/deaktivacija`)
        .expect(204);

      await kao(t, admin).delete(`/korisnik/${stanar.id}`).expect(204);

      expect(await korisnik(stanar.id)).toMatchObject({
        ime: 'Bivši',
        email: `obrisan-${stanar.id}@obrisan.invalid`,
      });
      await t.posta.sacekaj(stanar.email, 'Nalog je obrisan');
      await kao(t, admin)
        .delete(`/korisnik/${stanar.id}/deaktivacija`)
        .expect(404);
      await kao(t, admin).delete(`/korisnik/${stanar.id}`).expect(404);
      const spisak = await kao(t, admin)
        .get('/korisnik?stanje=deaktivirani&poStrani=100')
        .expect(200);
      expect(
        spisak.body.stavke.some((k: { id: number }) => k.id === stanar.id),
      ).toBe(false);
    });

    it('admin ne briše svoj ni drugi administratorski nalog', async () => {
      const drugiAdmin = await napraviKorisnika(t, 'DrugiAdmin', {
        uloga: Uloga.ADMIN,
      });
      await kao(t, admin).delete(`/korisnik/${admin.id}`).expect(403);
      await kao(t, admin).delete(`/korisnik/${drugiAdmin.id}`).expect(403);
    });

    it('stanar ne može da briše tuđ nalog', async () => {
      const stanar = await napraviKorisnika(t, 'Napadac');
      const zrtva = await napraviKorisnika(t, 'Zrtva');
      await kao(t, stanar).delete(`/korisnik/${zrtva.id}`).expect(403);
      expect((await korisnik(zrtva.id)).obrisan).toBeNull();
    });
  });

  it('kolačić sesije ostaje važeći kad brisanje ne uspe', async () => {
    const stanar = await napraviKorisnika(t, 'Kolacic');
    const { kolacic, token } = await prijavi(t, stanar.email);
    await kao(t, { ...stanar, token })
      .post('/korisnik/moj-profil/brisanje')
      .send({ lozinka: 'PogresnaLozinka1!' })
      .expect(400);
    kolacicSesije(
      await request(t.server)
        .post('/auth/refresh')
        .set('Cookie', kolacic)
        .expect(200),
    );
  });
});
