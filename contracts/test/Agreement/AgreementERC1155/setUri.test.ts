import { expect } from 'chai'
import {
  deployAgreementERC1155,
  deployInitialSetup,
} from '../../helpers/deployments'

describe('AgreementERC1155.setUri', () => {
  it('fails if sender is not an admin', async () => {
    const newUri = `ipfs://${'fb'.repeat(32)}`

    const initialSetup = await deployInitialSetup()
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [500, 500],
    })
    const nonAdminHolder = holders[1]
    expect(await agreement.isAdmin(nonAdminHolder.account)).to.be.false
    await expect(agreement.connect(nonAdminHolder.wallet).setUri(newUri)).to.be
      .reverted
  })
  it('sets new uri if sender is an admin', async () => {
    const newUri = `ipfs://${'fb'.repeat(32)}`

    const initialSetup = await deployInitialSetup()
    const { agreement, holders } = await deployAgreementERC1155({
      initialSetup,
      shares: [500, 500],
    })
    const adminHolder = holders[0]
    expect(await agreement.isAdmin(adminHolder.account)).to.be.true
    const tx = await agreement.connect(adminHolder.wallet).setUri(newUri)

    expect(await agreement.uri(1)).to.equal(newUri)
    await expect(Promise.resolve(tx))
      .to.emit(agreement, 'DataHashChanged')
      .withArgs(newUri)
  })
})
