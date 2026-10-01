SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."
export DATABASE_URL=postgres://user:password@localhost/postgres
cargo lambda build --release --features aws --bin aws_migrator
cargo lambda build --release --features aws --bin aa_aws_lambda_oward
cp -r rust/oward/config target/lambda/aa_aws_lambda_oward