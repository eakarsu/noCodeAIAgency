# Migration adoption for existing databases

This repository previously used `prisma db push` and had no migration history. The checked-in baseline is authoritative for **new empty databases**. Do not apply it directly to an existing schema: it will attempt to create objects that already exist.

For each existing database:

1. identify an accountable database owner and maintenance window;
2. take and verify a restorable backup;
3. clone the database into an isolated rehearsal environment;
4. compare the clone with `prisma/schema.prisma` and review every difference, constraint, index, and destructive warning;
5. create and peer-review an additive adoption migration for that exact legacy state;
6. apply it to the clone, run all database tests, verify tenant counts and audit records, and complete a restore drill;
7. only after the owner signs the evidence, use `prisma migrate resolve --applied 202607200001_governed_baseline` on the matching production database and apply the reviewed additive adoption migration.

`migrate resolve` is a declaration about external state, not a repair command. Never automate it in startup, CI, or a generic script. If the legacy state is unknown or differs from the rehearsed clone, stop.
