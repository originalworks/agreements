Build `.sqlx` folder after adding migration:

1. Run postgres docker image. Go to the `/local_setup` folder and run:

```bash
docker compose --env-file .env.local up postgres
```

2. Run migrations in account-abstraction repo (`https://github.com/originalworks/account-abstraction`)

3. Create schema `tokenization` in your postgres database

4. Run migrations in this repo:

```bash
cd rust/database
export DATABASE_URL="postgres://user:password@localhost/postgres?options=-c search_path=tokenization"
sqlx migrate run
```

5. Create `.sqlx` folder:

```bash
cargo sqlx prepare --workspace -- --all-features --all-targets
```
