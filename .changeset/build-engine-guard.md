---
"groot": patch
---

fix(build): assert bundled Prisma provider matches DATABASE_ENGINE

The generated Prisma client is bundled into dist/bundle.js, so the database
engine is baked in at build time. If the build environment resolves a different
DATABASE_ENGINE than the runtime one, the driver adapter and the bundled client
disagree and the server crashes on boot ("The Driver Adapter `@prisma/adapter-pg`
... is not compatible with the provider `sqlite`").

The build now asserts the bundled `activeProvider` matches `DATABASE_ENGINE`
after esbuild runs, turning this class of mismatch into a build failure instead
of a boot crash. The check is engine-agnostic and works for both sqlite and
postgres builds.
