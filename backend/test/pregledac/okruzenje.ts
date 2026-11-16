import { PREFIKS_TEST_BAZE } from '../pomoc/test-baza.js';

export const IME_BAZE = `${PREFIKS_TEST_BAZE}${process.pid}`;

process.env.DATABASE_NAME = IME_BAZE;
process.env.FRONTEND_URL = 'http://localhost:4300';
