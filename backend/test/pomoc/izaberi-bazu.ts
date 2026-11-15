import { inject } from 'vitest';

process.env.DATABASE_NAME = inject('testBaza');
