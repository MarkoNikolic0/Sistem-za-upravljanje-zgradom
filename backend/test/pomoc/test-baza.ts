import { existsSync } from 'node:fs';
import { DataSource } from 'typeorm';
import type { TestProject } from 'vitest/node';

export const PREFIKS_TEST_BAZE = 'zgrada_e2e_';

declare module 'vitest' {
  export interface ProvidedContext {
    testBaza: string;
  }
}

export default async function napraviTestBazu(projekat: TestProject) {
  if (existsSync('.env')) {
    process.loadEnvFile('.env');
  }
  const ime = `${PREFIKS_TEST_BAZE}${process.pid}`;
  const server = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: 'postgres',
  });
  await server.initialize();
  await server.query(`DROP DATABASE IF EXISTS ${ime} WITH (FORCE)`);
  await server.query(`CREATE DATABASE ${ime}`);
  projekat.provide('testBaza', ime);
  return async () => {
    await server.query(`DROP DATABASE IF EXISTS ${ime} WITH (FORCE)`);
    await server.destroy();
  };
}
