import { DataSource } from 'typeorm';

export const TEST_BAZA = 'zgrada_e2e';

export default async function napraviTestBazu() {
  process.loadEnvFile('.env');
  const server = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST,
    port: Number(process.env.DATABASE_PORT),
    username: process.env.DATABASE_USER,
    password: process.env.DATABASE_PASSWORD,
    database: 'postgres',
  });
  await server.initialize();
  await server.query(`DROP DATABASE IF EXISTS ${TEST_BAZA} WITH (FORCE)`);
  await server.query(`CREATE DATABASE ${TEST_BAZA}`);
  await server.destroy();
}
