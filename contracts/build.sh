rm -rf dist/
rm -rf src/
mkdir src
cp -R ./typechain ./src/typechain
cp -R ./helpers ./src/helpers
cp -R ./scripts ./src/scripts
cat <<EOT >> src/index.ts
import '@openzeppelin/hardhat-upgrades';

export * from './typechain';
export * from './helpers';
EOT
tsc -p tsconfig.build.json
rm -rf src/