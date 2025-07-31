import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { SignerWithAddress } from '@nomiclabs/hardhat-ethers/signers'
import { parseEther } from 'ethers/lib/utils'
import { FallbackVault } from '../../typechain'

describe('FallbackVault.withdraw', function () {
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
  it('withdraw funds registered for user (gasCost = 0)', async () => {
    const fundsToRegister = parseEther('1.33')
    const userBalanceBefore = await ethers.provider.getBalance(user.address)

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister })

    expect(await fallbackVault.balances(user.address)).to.equal(fundsToRegister)

    const tx = await fallbackVault.connect(user).withdraw(user.address, 0)
    const receipt = await tx.wait()
    const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice)
    const userBalanceAfter = await ethers.provider.getBalance(user.address)

    expect(userBalanceAfter.sub(userBalanceBefore).add(gasCost)).to.equal(
      fundsToRegister,
    )
  })

  it('withdraw funds registered for user (gasLimit > 0)', async () => {
    const gasLimit = 3500
    const fundsToRegister = parseEther('1.33')
    const userBalanceBefore = await ethers.provider.getBalance(user.address)

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister })

    expect(await fallbackVault.balances(user.address)).to.equal(fundsToRegister)

    const tx = await fallbackVault
      .connect(user)
      .withdraw(user.address, gasLimit)
    const receipt = await tx.wait()
    const gasCost = receipt.gasUsed.mul(receipt.effectiveGasPrice)
    const userBalanceAfter = await ethers.provider.getBalance(user.address)

    expect(userBalanceAfter.sub(userBalanceBefore).add(gasCost)).to.equal(
      fundsToRegister,
    )
  })

  it('can withdraw funds registered for user into different account (gasLimit = 0)', async () => {
    const fundsToRegister = parseEther('3.89')
    const differentAccountBalanceBefore = await ethers.provider.getBalance(
      differentAccount.address,
    )

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister })

    expect(await fallbackVault.balances(user.address)).to.equal(fundsToRegister)

    await fallbackVault.connect(user).withdraw(differentAccount.address, 0)

    const differentAccountBalanceAfter = await ethers.provider.getBalance(
      differentAccount.address,
    )

    expect(
      differentAccountBalanceAfter.sub(differentAccountBalanceBefore),
    ).to.equal(fundsToRegister)
  })

  it('can withdraw funds registered for user into different account (gasLimit > 0)', async () => {
    const gasLimit = 3500

    const fundsToRegister = parseEther('3.89')
    const differentAccountBalanceBefore = await ethers.provider.getBalance(
      differentAccount.address,
    )

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister })

    expect(await fallbackVault.balances(user.address)).to.equal(fundsToRegister)

    await fallbackVault
      .connect(user)
      .withdraw(differentAccount.address, gasLimit)

    const differentAccountBalanceAfter = await ethers.provider.getBalance(
      differentAccount.address,
    )

    expect(
      differentAccountBalanceAfter.sub(differentAccountBalanceBefore),
    ).to.equal(fundsToRegister)
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
      fallbackVault.connect(user).withdraw(user.address, 0),
    ).to.be.revertedWith('FallbackVault: no funds to withdraw')

    expect(userBalanceAfter.sub(userBalanceBefore)).to.equal(0)
    expect(
      differentAccountBalanceAfter.sub(differentAccountBalanceBefore),
    ).to.equal(0)
  })
})
