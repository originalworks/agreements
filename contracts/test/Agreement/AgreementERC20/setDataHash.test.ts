import { expect } from 'chai'
import {
  deployAgreementERC20,
  deployInitialSetup,
} from '../../helpers/deployments'

describe('AgreementERC20.setDataHash', () => {
  it('fails if sender is not an admin', async () => {
    const newDataHash = `0x${'fb'.repeat(32)}`

    const initialSetup = await deployInitialSetup()
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500, 500],
    })
    const nonAdminHolder = holders[1]
    expect(await agreement.isAdmin(nonAdminHolder.account)).to.be.false
    await expect(
      agreement.connect(nonAdminHolder.wallet).setDataHash(newDataHash),
    ).to.be.reverted
  })
  it('sets data hash if sender is an admin', async () => {
    const newDataHash = `0x${'fb'.repeat(32)}`

    const initialSetup = await deployInitialSetup()
    const { agreement, holders } = await deployAgreementERC20({
      initialSetup,
      shares: [500, 500],
    })
    const adminHolder = holders[0]
    expect(await agreement.isAdmin(adminHolder.account)).to.be.true
    const tx = await agreement
      .connect(adminHolder.wallet)
      .setDataHash(newDataHash)

    expect(await agreement.dataHash()).to.equal(newDataHash)
    await expect(Promise.resolve(tx))
      .to.emit(agreement, 'DataHashChanged')
      .withArgs(newDataHash)
  })
})
