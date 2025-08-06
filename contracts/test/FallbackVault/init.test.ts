import { expect } from 'chai';
import { ethers, upgrades } from 'hardhat';
import { FallbackVault } from '../../typechain';

describe('FallbackVault initialization', function () {
  it('Reverts when try to initialize again', async () => {
    const FallbackVault = await ethers.getContractFactory('FallbackVault');
    const fallbackVault = (await upgrades.deployProxy(FallbackVault, [], {
      kind: 'uups',
    })) as FallbackVault;
    await expect(fallbackVault.initialize()).to.be.revertedWith(
      'Initializable: contract is already initialized',
    );
  });
});
