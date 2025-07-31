import { mkdirSync, readFileSync, writeFileSync } from 'fs'

const mdFile = (contractName: string, path: string) => {
  const file = readFileSync(path, 'utf-8')
  const body = `
<h2>${contractName}</h2>

<pre><code class="language-solidity">${file}</code></pre>`
  const writePath = `documentationFiles/${contractName.replace(/\s+/g, '')}.md`
  writeFileSync(writePath, body)
}

const filesToConvert = [
  { contractName: 'Fee Manager', path: 'contracts/FeeManager.sol' },
  {
    contractName: 'Namespace Registry',
    path: 'contracts/NamespaceRegistry.sol',
  },
  { contractName: 'Fallback Vault', path: 'contracts/FallbackVault.sol' },
  {
    contractName: 'Agreement Relations registry',
    path: 'contracts/AgreementRelationsRegistry.sol',
  },
  {
    contractName: 'Split Currency List Manager',
    path: 'contracts/SplitCurrencyListManager.sol',
  },
  {
    contractName: 'Agreement ERC1155',
    path: 'contracts/agreements/AgreementERC1155.sol',
  },
  {
    contractName: 'Agreement ERC20',
    path: 'contracts/agreements/AgreementERC20.sol',
  },
  {
    contractName: 'Agreement Factory',
    path: 'contracts/agreements/AgreementFactory.sol',
  },
  {
    contractName: 'Agreement Proxy',
    path: 'contracts/agreements/AgreementProxy.sol',
  },
]
try {
  mkdirSync('documentationFiles')
} catch (err) {
  console.log(err)
}
filesToConvert.forEach((file) => mdFile(file.contractName, file.path))
