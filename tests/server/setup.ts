// Runs once before the test suite. NODE_ENV is set to "test" by the `test`
// script, and varlock resolves TEST_DATABASE_URL / DATABASE_URL to the
// isolated *_test database. The guard MUST run before any Prisma import so a
// misconfigured URL can never open a connection to a non-test database.
import { assertTestDatabase } from "./_db-guard";

process.env.NODE_ENV ??= "test";
assertTestDatabase(process.env.TEST_DATABASE_URL);
