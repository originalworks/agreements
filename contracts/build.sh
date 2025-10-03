rm -rf dist/
rm -rf src/
mkdir src
cp -R ./typechain ./src/typechain
cp -R ./tests-deployment-scripts ./src/tests-deployment-scripts
cat <<EOT >> src/index.ts
export * from './typechain'
export * from './tests-deployment-scripts'
EOT
tsc src/index.ts --outDir dist --lib es2022 --module nodenext --declarationMap true --declaration --skipLibCheck
rm -rf src/