import { expect } from 'chai'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { ethers } from 'hardhat'
import { NamespaceRegistry } from '../../typechain'
import { deployNamespaceRegistry } from '../../scripts/actions/deployNamespaceRegistry'

describe('NamespaceRegistry.canEditURI', function () {
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
  it('Return true if URI is in the namespace assigned to the address', async function () {
    const URI = `${revelatorNamespace}:123ABC`
    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [revelatorNamespaceOwner.address],
        [revelatorNamespace],
      )

    expect(
      await namespaceRegistry.canEditURI(URI, revelatorNamespaceOwner.address),
    ).to.be.true
  })

  it('Return false if URI is in different namespace then the one assigned to the address', async function () {
    const differentURI = 'SPOTIFY:123ABC'
    const revelatorURI = `${revelatorNamespace}:123ABC`

    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [revelatorNamespaceOwner.address],
        [revelatorNamespace],
      )

    expect(
      await namespaceRegistry.canEditURI(
        differentURI,
        revelatorNamespaceOwner.address,
      ),
    ).to.be.false

    expect(
      await namespaceRegistry.canEditURI(revelatorURI, someOtherWallet.address),
    ).to.be.false
  })

  it("Return false if URI doesn't have defined namespace or is in wrong format", async function () {
    const invalidURI1 = ':123ABC'
    const invalidURI2 = '123ABC'
    const invalidURI3 = `${revelatorNamespace}-123ABC`
    const invalidURI4 = `${revelatorNamespace}_123ABC`
    const invalidURI5 = `${revelatorNamespace}123ABC`

    await namespaceRegistry
      .connect(contractOwner)
      .setNamespaceForAddresses(
        [revelatorNamespaceOwner.address],
        [revelatorNamespace],
      )

    expect(
      await namespaceRegistry.canEditURI(
        invalidURI1,
        revelatorNamespaceOwner.address,
      ),
    ).to.be.false

    expect(
      await namespaceRegistry.canEditURI(
        invalidURI2,
        revelatorNamespaceOwner.address,
      ),
    ).to.be.false

    expect(
      await namespaceRegistry.canEditURI(
        invalidURI3,
        revelatorNamespaceOwner.address,
      ),
    ).to.be.false

    expect(
      await namespaceRegistry.canEditURI(
        invalidURI4,
        revelatorNamespaceOwner.address,
      ),
    ).to.be.false

    expect(
      await namespaceRegistry.canEditURI(
        invalidURI5,
        revelatorNamespaceOwner.address,
      ),
    ).to.be.false
  })
})
