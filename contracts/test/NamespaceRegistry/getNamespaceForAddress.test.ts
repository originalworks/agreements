import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { NamespaceRegistry } from '../../typechain'
import { deployNamespaceRegistry } from '../../scripts/actions/deployNamespaceRegistry'

describe('NamespaceRegistry.getNamespaceForAddress', function () {
  const revelatorNamespace = 'REVELATOR'

  let namespaceRegistry: NamespaceRegistry
  let contractOwner: SignerWithAddress
  let revelatorNamespaceOwner: SignerWithAddress
  let someOtherWallet: SignerWithAddress

  beforeEach(async () => {
    namespaceRegistry = await deployNamespaceRegistry()
    ;[contractOwner, revelatorNamespaceOwner, someOtherWallet] =
      await ethers.getSigners()
  })
  it('Return UNKNOWN: for address without defined namespace', async function () {
    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [revelatorNamespaceOwner.address],
        [revelatorNamespace],
      )

    expect(
      await namespaceRegistry.getNamespaceForAddress(someOtherWallet.address),
    ).equal('UNKNOWN:')
  })

  it("Return namespace with ':' separator for address with defined namespace", async function () {
    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [revelatorNamespaceOwner.address],
        [revelatorNamespace],
      )

    expect(
      await namespaceRegistry.getNamespaceForAddress(
        revelatorNamespaceOwner.address,
      ),
    ).equal(`${revelatorNamespace}:`)
  })
})
