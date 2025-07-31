import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'
import { FallbackVault } from '../../typechain'

describe('FallbackVault.withdrawFor', function () {
  let fallbackVault: FallbackVault
  let owner: SignerWithAddress
  let user: SignerWithAddress
  let differentAccount: SignerWithAddress

  beforeEach(async () => {
    ;[owner, user, differentAccount] = await ethers.getSigners()
    const FallbackVault = await ethers.getContractFactory('FallbackVault')
    fallbackVault = (await upgrades.deployProxy(FallbackVault, [], {
      kind: 'uups',
    })) as FallbackVault
  })
  it('withdraw funds registered for user from different account (gasCost = 0)', async () => {
    const fundsToRegister = parseEther('1.33')
    const userBalanceBefore = await ethers.provider.getBalance(user.address)

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister })

    expect(await fallbackVault.balances(user.address)).to.equal(fundsToRegister)

    await fallbackVault.connect(differentAccount).withdrawFor(user.address, 0)

    const userBalanceAfter = await ethers.provider.getBalance(user.address)

    expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(fundsToRegister)
  })

  it('withdraw funds registered for user from different account (gasLimit > 0)', async () => {
    const gasLimit = 3500
    const fundsToRegister = parseEther('1.33')
    const userBalanceBefore = await ethers.provider.getBalance(user.address)

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister })

    expect(await fallbackVault.balances(user.address)).to.equal(fundsToRegister)

    await fallbackVault
      .connect(differentAccount)
      .withdrawFor(user.address, gasLimit)

    const userBalanceAfter = await ethers.provider.getBalance(user.address)

    expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(fundsToRegister)
  })

  it("can't withdraw if there are no funds registered for user", async () => {
    const fundsToRegister = parseEther('3.89')
    const differentAccountBalanceBefore = await ethers.provider.getBalance(
      differentAccount.address,
    )
    const userBalanceBefore = await ethers.provider.getBalance(user.address)

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(differentAccount.address, {
        value: fundsToRegister,
      })

    const differentAccountBalanceAfter = await ethers.provider.getBalance(
      differentAccount.address,
    )
    const userBalanceAfter = await ethers.provider.getBalance(user.address)

    await expect(
      fallbackVault.connect(differentAccount).withdrawFor(user.address, 0),
    ).to.be.revertedWith('FallbackVault: no funds to withdraw')

    expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(0)
    expect(
      differentAccountBalanceAfter.sub(differentAccountBalanceBefore),
    ).to.equal(0)
  })
})
