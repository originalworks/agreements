import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { FallbackVault } from '../../typechain';
import { SignerWithAddress } from '@nomicfoundation/hardhat-ethers/signers';
import { parseEther } from 'ethers';

describe('FallbackVault.registerIncomingFunds', function () {
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
  it('register msg.value for given user', async () => {
    const fundsToRegister = parseEther('1.23');

    await fallbackVault
      .connect(owner)
      .registerIncomingFunds(user.address, { value: fundsToRegister });

    expect(await fallbackVault.balances(user.address)).to.equal(
      fundsToRegister,
    );
  });

  it('each account can register funds', async () => {
    const fundsToRegister = parseEther('1.23');

    await fallbackVault
      .connect(user)
      .registerIncomingFunds(differentAccount.address, {
        value: fundsToRegister,
      });

    await fallbackVault
      .connect(differentAccount)
      .registerIncomingFunds(user.address, {
        value: fundsToRegister,
      });

    expect(await fallbackVault.balances(user.address)).to.equal(
      fundsToRegister,
    );
    expect(await fallbackVault.balances(differentAccount.address)).to.equal(
      fundsToRegister,
    );
  });

  it('can register funds multiple times', async () => {
    const fundsToRegister = parseEther('1.23');

    await fallbackVault
      .connect(user)
      .registerIncomingFunds(differentAccount.address, {
        value: fundsToRegister,
      });

    await fallbackVault
      .connect(user)
      .registerIncomingFunds(differentAccount.address, {
        value: fundsToRegister,
      });

    await fallbackVault
      .connect(user)
      .registerIncomingFunds(differentAccount.address, {
        value: fundsToRegister,
      });

    expect(await fallbackVault.balances(differentAccount.address)).to.equal(
      fundsToRegister * 3n,
    );
  });
});
