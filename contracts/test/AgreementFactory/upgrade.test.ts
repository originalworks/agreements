import { expect } from 'chai'
import { ethers, upgrades } from 'hardhat'
import { deployInitialSetupLegacy } from '../helpers/legacyDeployment'

describe('upgrade AgreementFactory from V1 to current version', () => {
  it('should upgrade AgreementFactory contracts', async () => {
    const initialSetup = await deployInitialSetupLegacy()

    const AgreementFactoryV1 = await ethers.getContractFactory(
      'AgreementFactoryV1',
    )
    const agreementFactoryContract = await upgrades.deployProxy(
      AgreementFactoryV1,
      [
        initialSetup.agreementERC20Implementation.address,
        initialSetup.agreementERC1155Implementation.address,
        initialSetup.feeManager.address,
        initialSetup.lendingContract.address,
        initialSetup.agreementRelationsRegistry.address,
        initialSetup.splitCurrencyListManager.address,
        initialSetup.fallbackVault.address,
      ],
      { kind: 'uups' },
    )
    await agreementFactoryContract.deployed()

    const AgreementFactoryV2 = await ethers.getContractFactory(
      'AgreementFactoryV2',
    )
    await upgrades.validateUpgrade(AgreementFactoryV1, AgreementFactoryV2)
    await expect(
      upgrades.upgradeProxy(agreementFactoryContract, AgreementFactoryV2),
    ).not.to.be.reverted

    const AgreementFactoryV3 = await ethers.getContractFactory(
      'AgreementFactoryV3',
    )
    await upgrades.validateUpgrade(AgreementFactoryV2, AgreementFactoryV3)
    await expect(
      upgrades.upgradeProxy(agreementFactoryContract, AgreementFactoryV3),
    ).not.to.be.reverted

    const AgreementFactoryV4 = await ethers.getContractFactory(
      'AgreementFactoryV4',
    )
    await upgrades.validateUpgrade(AgreementFactoryV3, AgreementFactoryV4)
    await expect(
      upgrades.upgradeProxy(agreementFactoryContract, AgreementFactoryV4),
    ).not.to.be.reverted

    const AgreementFactoryV5 = await ethers.getContractFactory(
      'AgreementFactory',
    )
    await upgrades.validateUpgrade(AgreementFactoryV4, AgreementFactoryV5)
    await expect(
      upgrades.upgradeProxy(agreementFactoryContract, AgreementFactoryV5),
    ).not.to.be.reverted
  })
})
