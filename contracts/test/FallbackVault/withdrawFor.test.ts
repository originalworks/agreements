import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { FallbackVault } from '../../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { parseEther } from 'ethers';

describe('FallbackVault.withdrawFor', function () {
  let fallbackVault: FallbackVault;
  let owner: SignerWithAddress;
  let user: SignerWithAddress;
  let differentAccount: SignerWithAddress;

  beforeEach(async () => {
    [owner, user, differentAccount] = await ethers.getSigners();
    const FallbackVault = await ethers.getContractFactory('FallbackVault');
    fallbackVault = (await upgrades.deployProxy(FallbackVault, [], {
      kind: 'uups',
    })) as FallbackVault;
  });
  it('withdraw funds registered for user from different account (gasCost = 0)', async () => {
    const fundsToRegister = parseEther('1.33');
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister });

    expect(await fallbackVault.balances(user.address)).to.equal(
      fundsToRegister,
    );

    await fallbackVault.connect(differentAccount).withdrawFor(user.address, 0n);

    const userBalanceAfter = await ethers.provider.getBalance(user.address);

    expect(userBalanceAfter - userBalanceBefore).to.equal(fundsToRegister);
  });

  it('withdraw funds registered for user from different account (gasLimit > 0)', async () => {
    const gasLimit = 3500n;
    const fundsToRegister = parseEther('1.33');
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister });

    expect(await fallbackVault.balances(user.address)).to.equal(
      fundsToRegister,
    );

    await fallbackVault
      .connect(differentAccount)
      .withdrawFor(user.address, gasLimit);

    const userBalanceAfter = await ethers.provider.getBalance(user.address);

    expect(userBalanceAfter - userBalanceBefore).to.equal(fundsToRegister);
  });

  it("can't withdraw if there are no funds registered for user", async () => {
    const fundsToRegister = parseEther('3.89');
    const differentAccountBalanceBefore = await ethers.provider.getBalance(
      differentAccount.address,
    );
    const userBalanceBefore = await ethers.provider.getBalance(user.address);

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(differentAccount.address, {
        value: fundsToRegister,
      });

    const differentAccountBalanceAfter = await ethers.provider.getBalance(
      differentAccount.address,
    );
    const userBalanceAfter = await ethers.provider.getBalance(user.address);

    await expect(
      fallbackVault.connect(differentAccount).withdrawFor(user.address, 0n),
    ).to.be.revertedWith('FallbackVault: no funds to withdraw');

    expect(userBalanceAfter - userBalanceBefore).to.equal(0n);
    expect(
      differentAccountBalanceAfter - differentAccountBalanceBefore,
    ).to.equal(0n);
  });
});
