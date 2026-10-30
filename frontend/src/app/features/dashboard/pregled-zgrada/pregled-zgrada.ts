import { Component, inject } from '@angular/core';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { SkeletonModule } from 'primeng/skeleton';
import { ZgradaService } from '../../zgrade/zgrada-service';
import { PregledZgrade } from '../../zgrade/zgrada-models';

interface Brojac {
  naziv: string;
  putanja: string;
  broj: (p: PregledZgrade) => number;
}

const BROJACI: Brojac[] = [
  { naziv: 'Zahtevi za stan', putanja: '/zahtevi', broj: (p) => p.zahteviNaCekanju },
  { naziv: 'Novi kvarovi', putanja: '/kvarovi', broj: (p) => p.noviKvarovi },
  { naziv: 'Hitni kvarovi', putanja: '/kvarovi', broj: (p) => p.hitniKvarovi },
  { naziv: 'Odluke za objavu', putanja: '/glasanje', broj: (p) => p.neobjavljeneOdluke },
];

// Početna za admina: šta čeka u svakoj zgradi i njen sledeći sastanak
@Component({
  selector: 'app-pregled-zgrada',
  imports: [DatePipe, RouterLink, ButtonModule, SkeletonModule],
  templateUrl: './pregled-zgrada.html',
  styleUrl: './pregled-zgrada.scss',
})
export class PregledZgrada {
  protected readonly pregled = inject(ZgradaService).pregled();
  protected readonly brojaci = BROJACI;
}
